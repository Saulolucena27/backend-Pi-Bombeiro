import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import axios from 'axios';

const prisma = new PrismaClient();

export class OccurrenceController {
  // ==================== CREATE ====================
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        tipo,
        local,
        endereco,
        latitude,
        longitude,
        status,
        prioridade,
        descricao,
        responsavelId
      } = req.body;

      if (!tipo || !local || !endereco) {
        return res.status(400).json({
          success: false,
          message: 'Tipo, local e endereço são obrigatórios'
        });
      }

      let lat = latitude;
      let lng = longitude;

      // Se não tiver coordenadas, fazer geocoding
      if (!latitude || !longitude) {
        try {
          const geocoded = await this.geocodeAddress(endereco);
          lat = geocoded.latitude;
          lng = geocoded.longitude;
        } catch (error) {
          console.error('Geocoding error:', error);
          // Usa coordenadas padrão de Recife se falhar
          lat = -8.0476;
          lng = -34.877;
        }
      }

      const occurrence = await prisma.occurrence.create({
        data: {
          tipo,
          local,
          endereco,
          latitude: lat,
          longitude: lng,
          status: status || 'NOVO',
          prioridade: prioridade || 'MEDIA',
          descricao,
          criadoPorId: req.user!.id,
          responsavelId,
          dataOcorrencia: new Date()
        },
        include: {
          criadoPor: {
            select: {
              nome: true,
              email: true,
              cargo: true
            }
          },
          responsavel: {
            select: {
              nome: true,
              email: true,
              cargo: true
            }
          }
        }
      });

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          acao: 'CREATE',
          entidade: 'OCCURRENCE',
          entidadeId: occurrence.id,
          detalhes: { tipo, local },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Ocorrência criada com sucesso',
        data: occurrence
      });
    } catch (error) {
      console.error('Create occurrence error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar ocorrência'
      });
    }
  }

  // ==================== LIST ALL ====================
  async list(req: AuthRequest, res: Response) {
    try {
      const {
        status,
        tipo,
        prioridade,
        dataInicio,
        dataFim,
        page = 1,
        limit = 50
      } = req.query;

      const where: any = {};

      if (status) where.status = status;
      if (tipo) where.tipo = tipo;
      if (prioridade) where.prioridade = prioridade;

      if (dataInicio || dataFim) {
        where.dataOcorrencia = {};
        if (dataInicio) where.dataOcorrencia.gte = new Date(dataInicio as string);
        if (dataFim) where.dataOcorrencia.lte = new Date(dataFim as string);
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [occurrences, total] = await Promise.all([
        prisma.occurrence.findMany({
          where,
          include: {
            criadoPor: {
              select: {
                nome: true,
                email: true,
                cargo: true
              }
            },
            responsavel: {
              select: {
                nome: true,
                email: true,
                cargo: true
              }
            }
          },
          orderBy: { dataOcorrencia: 'desc' },
          skip,
          take
        }),
        prisma.occurrence.count({ where })
      ]);

      return res.json({
        success: true,
        data: occurrences,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('List occurrences error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar ocorrências'
      });
    }
  }

  // ==================== GET BY ID ====================
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const occurrence = await prisma.occurrence.findUnique({
        where: { id },
        include: {
          criadoPor: {
            select: {
              nome: true,
              email: true,
              cargo: true,
              telefone: true
            }
          },
          responsavel: {
            select: {
              nome: true,
              email: true,
              cargo: true,
              telefone: true
            }
          },
          historico: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!occurrence) {
        return res.status(404).json({
          success: false,
          message: 'Ocorrência não encontrada'
        });
      }

      return res.json({
        success: true,
        data: occurrence
      });
    } catch (error) {
      console.error('Get occurrence error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar ocorrência'
      });
    }
  }

  // ==================== UPDATE ====================
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, prioridade, descricao, responsavelId, observacoes } = req.body;

      const occurrence = await prisma.occurrence.findUnique({
        where: { id }
      });

      if (!occurrence) {
        return res.status(404).json({
          success: false,
          message: 'Ocorrência não encontrada'
        });
      }

      // Criar histórico se status mudou
      if (status && status !== occurrence.status) {
        await prisma.occurrenceHistory.create({
          data: {
            occurrenceId: id,
            statusAnterior: occurrence.status,
            statusNovo: status,
            observacao: observacoes,
            modificadoPor: req.user!.id
          }
        });
      }

      const dataUpdate: any = {
        updatedAt: new Date()
      };

      if (status) dataUpdate.status = status;
      if (prioridade) dataUpdate.prioridade = prioridade;
      if (descricao) dataUpdate.descricao = descricao;
      if (observacoes) dataUpdate.observacoes = observacoes;
      if (responsavelId) dataUpdate.responsavelId = responsavelId;

      // Atualizar datas de acordo com status
      if (status === 'EM_ATENDIMENTO' && !occurrence.dataAtendimento) {
        dataUpdate.dataAtendimento = new Date();
        // Calcular tempo de resposta em minutos
        const tempoResposta = Math.floor(
          (new Date().getTime() - occurrence.dataOcorrencia.getTime()) / 60000
        );
        dataUpdate.tempoResposta = tempoResposta;
      }

      if (status === 'CONCLUIDO' && !occurrence.dataConclusao) {
        dataUpdate.dataConclusao = new Date();
      }

      const updatedOccurrence = await prisma.occurrence.update({
        where: { id },
        data: dataUpdate,
        include: {
          criadoPor: {
            select: { nome: true, email: true }
          },
          responsavel: {
            select: { nome: true, email: true }
          }
        }
      });

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          acao: 'UPDATE',
          entidade: 'OCCURRENCE',
          entidadeId: id,
          detalhes: { status, prioridade },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.json({
        success: true,
        message: 'Ocorrência atualizada com sucesso',
        data: updatedOccurrence
      });
    } catch (error) {
      console.error('Update occurrence error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar ocorrência'
      });
    }
  }

  // ==================== DELETE ====================
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const occurrence = await prisma.occurrence.findUnique({
        where: { id }
      });

      if (!occurrence) {
        return res.status(404).json({
          success: false,
          message: 'Ocorrência não encontrada'
        });
      }

      await prisma.occurrence.delete({
        where: { id }
      });

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          acao: 'DELETE',
          entidade: 'OCCURRENCE',
          entidadeId: id,
          detalhes: { tipo: occurrence.tipo, local: occurrence.local },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.json({
        success: true,
        message: 'Ocorrência excluída com sucesso'
      });
    } catch (error) {
      console.error('Delete occurrence error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao excluir ocorrência'
      });
    }
  }

  // ==================== STATS ====================
  async getStats(req: AuthRequest, res: Response) {
    try {
      const [
        total,
        novas,
        emAnalise,
        emAtendimento,
        concluidas,
        porTipo,
        porPrioridade
      ] = await Promise.all([
        prisma.occurrence.count(),
        prisma.occurrence.count({ where: { status: 'NOVO' } }),
        prisma.occurrence.count({ where: { status: 'EM_ANALISE' } }),
        prisma.occurrence.count({ where: { status: 'EM_ATENDIMENTO' } }),
        prisma.occurrence.count({ where: { status: 'CONCLUIDO' } }),
        prisma.occurrence.groupBy({
          by: ['tipo'],
          _count: true
        }),
        prisma.occurrence.groupBy({
          by: ['prioridade'],
          _count: true
        })
      ]);

      // Calcular tempo médio de resposta
      const temposResposta = await prisma.occurrence.findMany({
        where: {
          tempoResposta: { not: null }
        },
        select: { tempoResposta: true }
      });

      const tempoMedioResposta = temposResposta.length > 0
        ? Math.round(
            temposResposta.reduce((sum, occ) => sum + (occ.tempoResposta || 0), 0) /
              temposResposta.length
          )
        : 0;

      return res.json({
        success: true,
        data: {
          total,
          porStatus: {
            novas,
            emAnalise,
            emAtendimento,
            concluidas
          },
          porTipo,
          porPrioridade,
          tempoMedioResposta // em minutos
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas'
      });
    }
  }

  // ==================== GEOCODING HELPER ====================
  private async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    try {
      // Usando OpenCage Geocoding API (gratuito)
      const apiKey = process.env.OPENCAGE_API_KEY;
      
      if (!apiKey) {
        throw new Error('API Key não configurada');
      }

      const response = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json`,
        {
          params: {
            q: `${address}, Recife, Pernambuco, Brasil`,
            key: apiKey,
            limit: 1
          }
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          latitude: result.geometry.lat,
          longitude: result.geometry.lng
        };
      }

      throw new Error('Endereço não encontrado');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }
}
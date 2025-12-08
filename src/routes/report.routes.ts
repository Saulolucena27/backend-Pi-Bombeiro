import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

/**
 * @route   GET /api/reports/dashboard
 * @desc    Dados para o dashboard principal
 * @access  Private
 */
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [
      totalOcorrencias,
      ocorrenciasHoje,
      ocorrenciasPendentes,
      ocorrenciasConcluidas,
      porTipo,
      porStatus,
      recentes
    ] = await Promise.all([
      prisma.occurrence.count(),
      prisma.occurrence.count({
        where: { dataOcorrencia: { gte: hoje } }
      }),
      prisma.occurrence.count({
        where: {
          status: { in: ['NOVO', 'EM_ANALISE'] }
        }
      }),
      prisma.occurrence.count({
        where: { status: 'CONCLUIDO' }
      }),
      prisma.occurrence.groupBy({
        by: ['tipo'],
        _count: true,
        orderBy: { _count: { tipo: 'desc' } }
      }),
      prisma.occurrence.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.occurrence.findMany({
        take: 10,
        orderBy: { dataOcorrencia: 'desc' },
        select: {
          id: true,
          tipo: true,
          local: true,
          status: true,
          dataOcorrencia: true,
          criadoPor: {
            select: { nome: true }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        resumo: {
          totalOcorrencias,
          ocorrenciasHoje,
          ocorrenciasPendentes,
          ocorrenciasConcluidas
        },
        distribuicao: {
          porTipo,
          porStatus
        },
        recentes
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do dashboard'
    });
  }
});

/**
 * @route   GET /api/reports/by-neighborhood
 * @desc    Relatório de ocorrências por bairro
 * @access  Private
 */
router.get('/by-neighborhood', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.dataOcorrencia = {};
      if (startDate) where.dataOcorrencia.gte = new Date(startDate as string);
      if (endDate) where.dataOcorrencia.lte = new Date(endDate as string);
    }

    const porBairro = await prisma.occurrence.groupBy({
      by: ['bairro'],
      where,
      _count: true,
      orderBy: { _count: { bairro: 'desc' } }
    });

    res.json({
      success: true,
      data: porBairro
    });
  } catch (error) {
    console.error('By neighborhood error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório por bairro'
    });
  }
});

/**
 * @route   GET /api/reports/by-period
 * @desc    Relatório de ocorrências por período
 * @access  Private
 */
router.get('/by-period', async (req: AuthRequest, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFormat: any;
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const occurrences = await prisma.occurrence.findMany({
      where: {
        dataOcorrencia: { gte: startDate }
      },
      select: {
        dataOcorrencia: true,
        tipo: true,
        status: true
      }
    });

    // Agrupar por dia
    const groupedByDay: { [key: string]: number } = {};
    
    occurrences.forEach((occ: { dataOcorrencia: { toISOString: () => string; }; }) => {
      const day = occ.dataOcorrencia.toISOString().split('T')[0];
      groupedByDay[day] = (groupedByDay[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        byDay: groupedByDay,
        total: occurrences.length
      }
    });
  } catch (error) {
    console.error('By period error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório por período'
    });
  }
});

/**
 * @route   GET /api/reports/performance
 * @desc    Relatório de performance (tempos de resposta)
 * @access  Private
 */
router.get('/performance', async (_req: AuthRequest, res) => {
  try {
    const occurrencesWithTempo = await prisma.occurrence.findMany({
      where: {
        tempoResposta: { not: null }
      },
      select: {
        tipo: true,
        prioridade: true,
        tempoResposta: true,
        status: true
      }
    });

    const tempoMedio = occurrencesWithTempo.length > 0
      ? Math.round(
          occurrencesWithTempo.reduce((sum: any, occ: { tempoResposta: any; }) => sum + (occ.tempoResposta || 0), 0) /
            occurrencesWithTempo.length
        )
      : 0;

    // Agrupar por tipo
    const porTipo: { [key: string]: number[] } = {};
    occurrencesWithTempo.forEach((occ: { tipo: string | number; tempoResposta: any; }) => {
      if (!porTipo[occ.tipo]) porTipo[occ.tipo] = [];
      porTipo[occ.tipo].push(occ.tempoResposta || 0);
    });

    const tempoMedioPorTipo = Object.entries(porTipo).map(([tipo, tempos]) => ({
      tipo,
      tempoMedio: Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
    }));

    res.json({
      success: true,
      data: {
        tempoMedioGeral: tempoMedio,
        totalOcorrencias: occurrencesWithTempo.length,
        porTipo: tempoMedioPorTipo
      }
    });
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de performance'
    });
  }
});

export default router;
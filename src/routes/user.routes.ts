import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, checkPermission, AuthRequest } from '../middlewares/auth.middleware';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

/**
 * @route   GET /api/users
 * @desc    Listar todos os usuários
 * @access  Private (Admin)
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, departamento, cargo } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (departamento) where.departamento = departamento;
    if (cargo) where.cargo = cargo;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        departamento: true,
        status: true,
        telefone: true,
        avatar: true,
        permissoes: true,
        createdAt: true,
        ultimoAcesso: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Obter um usuário específico
 * @access  Private
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        departamento: true,
        status: true,
        telefone: true,
        avatar: true,
        permissoes: true,
        createdAt: true,
        ultimoAcesso: true,
        ocorrenciasCriadas: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            tipo: true,
            local: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuário'
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Atualizar usuário
 * @access  Private (Admin ou próprio usuário)
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, cargo, departamento, status, permissoes } = req.body;

    // Verificar se é admin ou o próprio usuário
    if (req.user!.id !== id && !req.user!.permissoes.includes('Gerenciar')) {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para atualizar este usuário'
      });
    }

    const dataUpdate: any = {};
    if (nome) dataUpdate.nome = nome;
    if (telefone) dataUpdate.telefone = telefone;
    
    // Apenas admin pode mudar cargo, departamento, status e permissões
    if (req.user!.permissoes.includes('Gerenciar')) {
      if (cargo) dataUpdate.cargo = cargo;
      if (departamento) dataUpdate.departamento = departamento;
      if (status) dataUpdate.status = status;
      if (permissoes) dataUpdate.permissoes = permissoes;
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataUpdate,
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        departamento: true,
        status: true,
        telefone: true,
        avatar: true,
        permissoes: true
      }
    });

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário'
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Excluir usuário
 * @access  Private (Admin apenas)
 */
router.delete('/:id', checkPermission('Gerenciar'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.user!.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode excluir sua própria conta'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir usuário'
    });
  }
});

/**
 * @route   PUT /api/users/:id/password
 * @desc    Alterar senha do usuário
 * @access  Private
 */
router.put('/:id/password', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { senhaAtual, novaSenha } = req.body;

    // Só pode trocar a própria senha
    if (req.user!.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Você só pode alterar sua própria senha'
      });
    }

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, user.senha);

    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: { id },
      data: { senha: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha'
    });
  }
});

export default router;
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export class AuthController {
  // ==================== LOGIN ====================
  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios'
        });
      }

      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, user.senha);

      if (!senhaValida) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verificar status
      if (user.status !== 'ATIVO') {
        return res.status(403).json({
          success: false,
          message: 'Usuário inativo ou pendente de aprovação'
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          cargo: user.cargo
        },
        process.env.JWT_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Atualizar último acesso
      await prisma.user.update({
        where: { id: user.id },
        data: { ultimoAcesso: new Date() }
      });

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          acao: 'LOGIN',
          entidade: 'AUTH',
          detalhes: { email: user.email },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            cargo: user.cargo,
            departamento: user.departamento,
            avatar: user.avatar,
            permissoes: user.permissoes
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao realizar login'
      });
    }
  }

  // ==================== REGISTER ====================
  async register(req: Request, res: Response) {
    try {
      const {
        nome,
        email,
        senha,
        cargo,
        departamento,
        telefone,
        permissoes
      } = req.body;

      // Validações
      if (!nome || !email || !senha || !cargo || !departamento || !telefone) {
        return res.status(400).json({
          success: false,
          message: 'Todos os campos obrigatórios devem ser preenchidos'
        });
      }

      // Verificar se email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email já cadastrado'
        });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, 10);

      // Criar avatar com iniciais
      const iniciais = nome
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          nome,
          email: email.toLowerCase(),
          senha: hashedPassword,
          cargo,
          departamento,
          telefone,
          avatar: iniciais,
          permissoes: permissoes || ['Visualizar'],
          status: 'PENDENTE' // Precisa de aprovação do admin
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso. Aguarde aprovação do administrador.',
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao cadastrar usuário'
      });
    }
  }

  // ==================== GET CURRENT USER ====================
  async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          departamento: true,
          telefone: true,
          avatar: true,
          status: true,
          permissoes: true,
          createdAt: true,
          ultimoAcesso: true
        }
      });

      return res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar dados do usuário'
      });
    }
  }

  // ==================== LOGOUT ====================
  async logout(req: AuthRequest, res: Response) {
    try {
      if (req.user) {
        // Log de auditoria
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            acao: 'LOGOUT',
            entidade: 'AUTH',
            detalhes: {},
            ip: req.ip,
            userAgent: req.headers['user-agent']
          }
        });
      }

      return res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao realizar logout'
      });
    }
  }
}
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuário
 * @access  Public
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * @route   POST /api/auth/register
 * @desc    Registro de novo usuário
 * @access  Public
 */
router.post('/register', (req, res) => authController.register(req, res));

/**
 * @route   GET /api/auth/me
 * @desc    Obter dados do usuário logado
 * @access  Private
 */
router.get('/me', authMiddleware, (req, res) => authController.getCurrentUser(req, res));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuário
 * @access  Private
 */
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));

export default router;
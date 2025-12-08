import { Router } from 'express';
import { OccurrenceController } from '../controllers/occurrence.controller';
import { authMiddleware, checkPermission } from '../middlewares/auth.middleware';

const router = Router();
const occurrenceController = new OccurrenceController();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

/**
 * @route   GET /api/occurrences
 * @desc    Listar todas as ocorrências com filtros
 * @access  Private
 */
router.get('/', (req, res) => occurrenceController.list(req, res));

/**
 * @route   GET /api/occurrences/stats
 * @desc    Obter estatísticas das ocorrências
 * @access  Private
 */
router.get('/stats', (req, res) => occurrenceController.getStats(req, res));

/**
 * @route   GET /api/occurrences/:id
 * @desc    Obter uma ocorrência específica
 * @access  Private
 */
router.get('/:id', (req, res) => occurrenceController.getById(req, res));

/**
 * @route   POST /api/occurrences
 * @desc    Criar nova ocorrência
 * @access  Private (Permissão: Criar)
 */
router.post('/', (req, res) => occurrenceController.create(req, res));

/**
 * @route   PUT /api/occurrences/:id
 * @desc    Atualizar ocorrência
 * @access  Private (Permissão: Editar)
 */
router.put('/:id', (req, res) => occurrenceController.update(req, res));

/**
 * @route   DELETE /api/occurrences/:id
 * @desc    Excluir ocorrência
 * @access  Private (Permissão: Excluir)
 */
router.delete('/:id', checkPermission('Excluir'), (req, res) => 
  occurrenceController.delete(req, res)
);

export default router;
import { Router } from 'express';
import { createRoom, getRoom } from './roomManager';
import type { Language } from '@collab-editor/shared';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const language: Language = req.body.language ?? 'javascript';
    const room = await createRoom(language);
    res.status(201).json({ room });
  } catch (err) {
    console.error('create room error', err);
    res.status(500).json({ error: 'could not create room' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'room not found' });
    res.json({ room });
  } catch (err) {
    console.error('get room error', err);
    res.status(500).json({ error: 'could not get room' });
  }
});

export default router;
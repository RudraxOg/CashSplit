const router = require('express').Router();
const series = require('../services/expenseSeries');
router.get('/', async (req, res, next) => { try { res.json(await series.list(req.query.groupId || 'g1', req.user.id)); } catch (error) { next(error); } });
router.post('/', async (req, res, next) => { try { res.status(201).json(await series.create(req.body, req.user.id)); } catch (error) { next(error); } });
router.patch('/:id', async (req, res, next) => { try { res.json(await series.update(req.params.id, req.body, req.user.id)); } catch (error) { next(error); } });
module.exports = router;

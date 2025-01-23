const { hash } = require('bcrypt');
const { prisma, express, router, bcrypt, jwt } = require('../common');
const JWT_SECRET = process.env.JWT_SECRET;
module.exports = router;

const createToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '1h' });
};

const isLoggedIn = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.slice(7);
  if (!token) return next();
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findFirstOrThrow({
      where: {
        id,
      },
    });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token. Please login again.' });
  }
};

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log(`Created user: ${username}, password: ${password}`);
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const response = await prisma.user.create({
      data: {
        username,
        password: hashPassword,
      },
    });
    if (response.id) {
      const token = createToken(response.id);
      res.status(201).json({ token });
    } else {
      res.status(400).json({ message: 'Please try again.' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findFirstOrThrow({
      where: {
        username,
      },
    });
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      const token = createToken(user.id);
      res.status(200).json({ token });
    } else {
      res.status(401).json({ message: 'Not authorized.' });
    }
  } catch (error) {
    res.status(403).json({ message: 'Cannot login.' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const response = await prisma.product.findMany();
    res.status(200).json(response);
  } catch (error) {
    res.status(400).send({ message: 'Could not find products' });
  }
});

router.get('/products/:id', isLoggedIn, async (req, res) => {
  console.log('Incoming request for product ID:', req.params.id);
  const { id } = req.params;
  try {
    const response = await prisma.product.findFirstOrThrow({
      where: {
        id,
      },
      include: {
        orders: {
          where: {
            customerId: req.user.id,
          },
        },
      },
    });
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching product:', error);
    res
      .status(401)
      .send({ message: 'Invalid token. Product cannot be found.' });
  }
});

router.get('/orders', isLoggedIn, async (req, res, next) => {
  try {
    const response = await prisma.order.findMany({
      where: {
        customerId: req.user.id,
      },
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(401).send({ message: 'Not authorized.' });
  }
});

router.post('/orders', isLoggedIn, async (req, res) => {
  try {
    const { date, note, productIds } = req.body;
    const response = await prisma.order.create({
      data: {
        date,
        note,
        customerId: req.user.id,
        products: {
          connect: productIds.map((id) => ({ id })),
        },
      },
    });
    res.status(201).json(response);
  } catch (error) {
    res.status(401).send({ message: 'Not authorized.' });
  }
});

router.get('/orders/:id', isLoggedIn, async (req, res, next) => {
  const { id } = req.params;
  try {
    const response = await prisma.order.findFirstOrThrow({
      where: {
        id,
        customerId: req.user.id,
      },
      include: {
        products: true,
      },
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(403).send({ message: 'Cannot access order.' });
  }
});

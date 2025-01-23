const { Decimal } = require('@prisma/client/runtime/library');
const { prisma, faker } = require('./common');

const seed = async (numProducts = 20) => {
  try {
    const products = [];

    for (let i = 0; i < numProducts; i++) {
      const product = await prisma.product.create({
        data: {
          title: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          price: faker.commerce.price(),
        },
      });
      products.push(product);
    }
    console.log('Seeding complete.');
  } catch (error) {
    console.error(error);
  }
};

seed();

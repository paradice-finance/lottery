import { ethers } from 'hardhat';

const { SUBSCRIPTION_ID } = process.env;
async function main() {
  const MockToken = await ethers.getContractFactory('MockToken');

  const token = await MockToken.deploy();
  try {
    await token.deployed();
    console.log('Token address:', token.address);
  } catch (error: any) {
    console.log(`Deploy Error: ${error.message}`);
  }

  const Lottery = await ethers.getContractFactory('Lottery');

  const lottery = await Lottery.deploy(
    token.address,
    2,
    1,
    process.env.TREASURY_ADDRESS!!
  );

  try {
    await lottery.deployed();
    console.log('lottery address:', lottery.address);
  } catch (error: any) {
    console.log(`Lottery Deploy Error: ${error.message}`);
  }

  const RandomNumberGenerator = await ethers.getContractFactory(
    'MockRandomNumberGenerator'
  );

  const randomNumberGenerator = await RandomNumberGenerator.deploy(
    SUBSCRIPTION_ID!!,
    lottery.address
  );

  try {
    await randomNumberGenerator.deployed();
    console.log(
      'RandomNumberGenerator address:',
      randomNumberGenerator.address
    );
  } catch (error: any) {
    console.log(`Lottery Deploy Error: ${error.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

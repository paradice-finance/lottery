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
    token.address, //_token
    20, // _sizeOfLotteryNumbers
    1, // _ticketPrice
    process.env.TREASURY_ADDRESS!!, // _treasuryAddress
    4, // _treasuryRatio
    1, // _affiliateRatio
    95 // _winnerRatio
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

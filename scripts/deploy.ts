import { ethers } from 'hardhat';

const { SUBSCRIPTION_ID, GOERLI_LINK_KEY_HASH, GOERLI_VRF_COORDINATOR } =
  process.env;
async function main() {
  const MockToken = await ethers.getContractFactory('Mock_erc20');

  const token = await MockToken.deploy(10000);
  try {
    await token.deployed();
    console.log('Token address:', token.address);
  } catch (error: any) {
    console.log(`Deploy Error: ${error.message}`);
  }

  const Lottery = await ethers.getContractFactory('Lottery');

  const lottery = await Lottery.deploy(
    token.address, //_token
    5, // _sizeOfLotteryNumbers
    999999, // maximum number of chosen numbers
    1000000000000000000n, // _ticketPrice
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
    'RandomNumberGenerator'
  );

  const randomNumberGenerator = await RandomNumberGenerator.deploy(
    SUBSCRIPTION_ID!!,
    lottery.address,
    GOERLI_VRF_COORDINATOR!!,
    GOERLI_LINK_KEY_HASH!!
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

  await lottery.initialize(randomNumberGenerator.address);
  console.log('initialize success');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from 'hardhat';

async function main() {
  const MockToken = await ethers.getContractFactory('Mock_erc20');
  const token = await MockToken.deploy(10000);
  try {
    await token.deployed();
    console.log('Token address:', token.address);
  } catch (error: any) {
    console.log(`Deploy Error: ${error.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

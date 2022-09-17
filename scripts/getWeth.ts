import { ethers, getChainId, getNamedAccounts } from "hardhat"
import { IWeth } from "../typechain/contracts/IWeth"

export const WETH_AMOUNT = ethers.utils.parseEther("0.02")
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
export async function getWeth(): Promise<void> {
  const { deployer } = await getNamedAccounts()
  const iWeth: IWeth = await ethers.getContractAt("IWeth", WETH_ADDRESS, deployer)
  const tx = await iWeth.deposit({ value: WETH_AMOUNT })
  await tx.wait(1)
  const wethBalance = await iWeth.balanceOf(deployer)
  console.log(`Got ${wethBalance.toString()} WETH`)
}


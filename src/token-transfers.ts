import { ethers } from 'ethers'
import { predeploys } from './predeploys'
import L2StandardERC20ABI from './contract-metadata/L2StandardERC20ABI.json'
import { ERC20Transfer, ERC20TransfersOptions } from './types'

/**
 * Transfers of ETH
 *
 * @param {string} accountAddress Account address
 * @param {ethers.providers.JsonRpcProvider} l2Provider L1 provider
 * @param {ethers.providers.BlockTag} [fromBlock] Tag of from block
 * @param {ethers.providers.BlockTag} [toBlock] Tag of to block
 * @param {ERC20TransfersOptions} [options] Options
 * @param {boolean} [options.transactionResponse] If true then include the transaction response
 * @param {boolean} [options.transactionReceipt] If true then include the transaction receipt
 * @param {boolean} [options.isSender] If false then don't include transfers with accountAddress as sender
 * @param {boolean} [options.isRecipient] If false then don't include transfers with accountAddress as recipient
 * @returns Returns the account's transfers of ETH
 */
export const transfersOfETH = async (
  accountAddress: string,
  l2Provider: ethers.providers.JsonRpcProvider,
  fromBlock?: ethers.providers.BlockTag,
  toBlock?: ethers.providers.BlockTag,
  options?: ERC20TransfersOptions
): Promise<Array<ERC20Transfer>> => {
  return transfersOfERC20(predeploys.NVM_ETH, accountAddress, l2Provider, fromBlock, toBlock, options)
}

/**
 * Transfers of ERC20 token
 *
 * @param {string} contractAddress L2 address of ERC20 contract instance
 * @param {string} accountAddress Account address
 * @param {ethers.providers.JsonRpcProvider} l2Provider L1 provider
 * @param {ethers.providers.BlockTag} [fromBlock] Tag of from block
 * @param {ethers.providers.BlockTag} [toBlock] Tag of to block
 * @param {ERC20TransfersOptions} [options] Options
 * @param {boolean} [options.transactionResponse] If true then include the transaction response
 * @param {boolean} [options.transactionReceipt] If true then include the transaction receipt
 * @param {boolean} [options.isSender] If false then don't include transfers with accountAddress as sender
 * @param {boolean} [options.isRecipient] If false then don't include transfers with accountAddress as recipient
 * @returns Returns the account's transfers of the ERC20 tokens
 */
export const transfersOfERC20 = async (
  contractAddress: string,
  accountAddress: string,
  l2Provider: ethers.providers.JsonRpcProvider,
  fromBlock?: ethers.providers.BlockTag,
  toBlock?: ethers.providers.BlockTag,
  options?: ERC20TransfersOptions
): Promise<Array<ERC20Transfer>> => {
  const L2StandardERC20Interface = new ethers.utils.Interface(L2StandardERC20ABI)
  const contract = new ethers.Contract(contractAddress, L2StandardERC20Interface, l2Provider)

  const [sends, receives] = await Promise.all([
    !options || options.isSender !== false
      ? contract.queryFilter(contract.filters.Transfer(accountAddress, undefined), fromBlock, toBlock)
      : [],
    !options || options.isRecipient !== false
      ? contract.queryFilter(contract.filters.Transfer(undefined, accountAddress), fromBlock, toBlock)
      : [],
  ])

  return Promise.all(
    [...sends, ...receives].map(async (ev) => {
      const [sender, recipient, amount] = ev.args as Array<any>
      const [transactionResponse, transactionReceipt] = await Promise.all([
        options && options.transactionResponse ? await ev.getTransaction() : undefined,
        options && options.transactionReceipt ? await ev.getTransactionReceipt() : undefined,
      ])

      return {
        contractAddress,
        sender,
        recipient,
        amount,
        transactionResponse,
        transactionReceipt,
      }
    })
  )
}

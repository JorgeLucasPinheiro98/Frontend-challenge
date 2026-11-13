const WEI_DECIMALS = 18n
const WEI_FACTOR = 10n ** WEI_DECIMALS

export function ethToWei(eth: string): bigint {
  const normalized = eth.trim()
  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
    return 0n
  }

  const [wholePart, fractionPart = ""] = normalized.split(".")
  const paddedFraction = fractionPart
    .slice(0, Number(WEI_DECIMALS))
    .padEnd(Number(WEI_DECIMALS), "0")

  return BigInt(wholePart) * WEI_FACTOR + BigInt(paddedFraction)
}

export function weiToEth(wei: bigint, minDecimals = 2): string {
  const isNegative = wei < 0n
  const absWei = isNegative ? -wei : wei

  const wholePart = absWei / WEI_FACTOR
  const fractionPart = (absWei % WEI_FACTOR)
    .toString()
    .padStart(Number(WEI_DECIMALS), "0")

  const trimmedFraction = fractionPart.replace(/0+$/, "")
  const finalFraction =
    trimmedFraction.length < minDecimals
      ? trimmedFraction.padEnd(minDecimals, "0")
      : trimmedFraction.slice(0, 6)

  const sign = isNegative ? "-" : ""
  return `${sign}${wholePart.toString()}.${finalFraction}`
}

export function addEth(a: string, b: string): string {
  return weiToEth(ethToWei(a) + ethToWei(b))
}

export function subEth(a: string, b: string): string {
  const diff = ethToWei(a) - ethToWei(b)
  return weiToEth(diff < 0n ? 0n : diff)
}

export function mulEthInt(eth: string, quantity: number): string {
  if (quantity <= 0) return "0.00"
  return weiToEth(ethToWei(eth) * BigInt(Math.floor(quantity)))
}

export function calcPercentageEth(eth: string, percentage: number): string {
  const wei = ethToWei(eth)
  const basisPoints = BigInt(Math.round(percentage * 100))
  return weiToEth((wei * basisPoints) / 10000n)
}

export function compareEth(a: string, b: string): number {
  const diff = ethToWei(a) - ethToWei(b)
  if (diff > 0n) return 1
  if (diff < 0n) return -1
  return 0
}
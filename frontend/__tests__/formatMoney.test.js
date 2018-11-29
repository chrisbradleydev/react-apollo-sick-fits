import formatMoney from '../lib/formatMoney'

describe('formatMoney function', () => {
    it('works with fractional dollars', () => {
        expect(formatMoney(1)).toEqual('$0.01')
        expect(formatMoney(10)).toEqual('$0.10')
        expect(formatMoney(40)).toEqual('$0.40')
    })

    it('leaves cents off for whole dollars', () => {
        expect(formatMoney(100)).toEqual('$1')
        expect(formatMoney(5000)).toEqual('$50')
        expect(formatMoney(50000000)).toEqual('$500,000')
    })

    it('works with whole and fractional dollars', () => {
        expect(formatMoney(101)).toEqual('$1.01')
        expect(formatMoney(350)).toEqual('$3.50')
        expect(formatMoney(8675309)).toEqual('$86,753.09')
    })
})

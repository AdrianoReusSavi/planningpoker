const estimationOptions = [
  {
    key: 'Fibonacci',
    label: 'Fibonacci',
    value: 0,
    desc: '[1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ∞]',
    list: ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '∞'],
  },
  {
    key: 'TShirtSizes',
    label: 'Tamanhos de Camiseta',
    value: 1,
    desc: '[XS, S, M, L, XL]',
    list: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    key: 'Sequential',
    label: 'Sequencial',
    value: 2,
    desc: '[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]',
    list: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  },
  {
    key: 'Linear',
    label: 'Linear',
    value: 3,
    desc: '[1, 2, 3, 4, 5]',
    list: ['1', '2', '3', '4', '5'],
  },
  {
    key: 'PowersOfTwo',
    label: 'Potências de Dois',
    value: 4,
    desc: '[1, 2, 4, 8, 16, 32, 64, 128]',
    list: ['1', '2', '4', '8', '16', '32', '64', '128'],
  },
  {
    key: 'HalfPoint',
    label: 'Meio Ponto',
    value: 5,
    desc: '[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]',
    list: ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0'],
  },
]

export function getDeckByKey(key: string) {
  return estimationOptions.find(o => o.key === key) ?? estimationOptions[0]
}

export default estimationOptions
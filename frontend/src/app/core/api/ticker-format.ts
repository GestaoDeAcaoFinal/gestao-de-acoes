// Mesmo contrato de AcaoRequestDTO/TickerNormalizer: ponto entre blocos,
// pelo menos uma letra e até 12 caracteres após remover espaços externos.
export const TICKER_PATTERN = /^\s*(?=[A-Za-z0-9.]{1,12}\s*$)(?=[A-Za-z0-9.]*[A-Za-z])[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\s*$/;

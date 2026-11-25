import { ValidatorFn } from '@angular/forms';

export function cpfValido(value: string): boolean {
  const texto = value.trim();
  if (!/^(?:[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/.test(texto)) return false;
  const cpf = texto.replace(/\D/g, '');
  if (/^([0-9])\1{10}$/.test(cpf)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    if ((soma * 10 % 11) % 10 !== Number(cpf[tamanho])) return false;
  }
  return true;
}

export function telefoneValido(value: string): boolean {
  const texto = value.trim();
  if (!/^(?:[0-9]{10,11}|\([0-9]{2}\) ?[0-9]{4,5}-[0-9]{4}|[0-9]{2} [0-9]{4,5}-?[0-9]{4})$/.test(texto)) return false;
  return /^(?:1[1-9]|2[12478]|3[1-578]|4[1-9]|5[1345]|6[1-9]|7[134579]|8[1-9]|9[1-9])(?:[2-5][0-9]{7}|9[0-9]{8})$/.test(texto.replace(/\D/g, ''));
}

export const cpfValidator: ValidatorFn = control => cpfValido(String(control.value ?? '')) ? null : { cpf: true };
export const telefoneValidator: ValidatorFn = control => telefoneValido(String(control.value ?? '')) ? null : { telefone: true };

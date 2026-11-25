import { FormControl } from '@angular/forms';
import { cpfValido, cpfValidator, telefoneValido, telefoneValidator } from './usuario.validators';

describe('Validação de dados do usuário', () => {
  for (const cpf of ['52998224725', '529.982.247-25', '11144477735']) {
    it('aceita CPF com dígitos verificadores corretos: ' + cpf, () => expect(cpfValido(cpf)).toBeTrue());
  }
  for (const cpf of ['', ' ', '00000000000', '11111111111', '52998224724', '52998224715', '5299822472', '529982247-25', 'abc52998224725']) {
    it('rejeita CPF malformado ou inválido: ' + cpf, () => expect(cpfValido(cpf)).toBeFalse());
  }
  for (const telefone of ['11999999999', '(11) 99999-9999', '(21) 3333-4444', '21 33334444']) {
    it('aceita telefone com DDD: ' + telefone, () => expect(telefoneValido(telefone)).toBeTrue());
  }
  for (const telefone of ['', '999999999', '20999999999', '00999999999', '11899999999', '1112345678', '+55 11 99999-9999', '(11 99999-9999', '11abc999999999']) {
    it('rejeita telefone inválido: ' + telefone, () => expect(telefoneValido(telefone)).toBeFalse());
  }
  it('integra a validação com controles reativos, inclusive vazios', () => {
    const cpf = new FormControl('', cpfValidator);
    const telefone = new FormControl('', telefoneValidator);
    expect(cpf.hasError('cpf')).toBeTrue();
    expect(telefone.hasError('telefone')).toBeTrue();
    cpf.setValue('529.982.247-25'); telefone.setValue('(11) 99999-9999');
    expect(cpf.valid).toBeTrue(); expect(telefone.valid).toBeTrue();
  });
});

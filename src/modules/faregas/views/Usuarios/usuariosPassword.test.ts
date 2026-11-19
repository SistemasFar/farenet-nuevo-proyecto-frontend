import { describe, expect, it } from 'vitest';
import {
  evaluarPasswordSegura,
  validarFormularioUsuario,
  validarPasswordSegura
} from './usuariosValidacion';

const formularioValido = {
  username: 'operador', tipoDocumentoKey: 'dni', nroDocumento: '12345678',
  nombres: 'ANA', apellidos: 'PRUEBA', direccion: 'AVENIDA PRUEBA 123',
  telefono: '987654321', email: 'ana@example.pe', paisKey: 'PE',
  departamentoKey: '15', provinciaKey: '1501', distritoKey: '150101',
};

describe('política de contraseñas de usuarios FAREGAS', () => {
  it('Contraseña de 3 caracteres: rechazada en entorno de pruebas', () => {
    const error = validarPasswordSegura('Ab1', 'operador');
    expect(error).toMatch(/al menos 4 caracteres/);
  });

  it('Contraseña de 4 caracteres: aceptada en el entorno de pruebas configurado con advertencia visible', () => {
    const error = validarPasswordSegura('1234', 'operador');
    expect(error).toBeNull();

    const evaluacion = evaluarPasswordSegura('1234', 'operador');
    expect(evaluacion.valido).toBe(true);
    expect(evaluacion.esDebil).toBe(true);
    expect(evaluacion.advertencia).toMatch(/Contraseña débil/);
  });

  it('Contraseña de 8 caracteres: aceptada', () => {
    const error = validarPasswordSegura('Pass2026', 'operador');
    expect(error).toBeNull();
  });

  it('Contraseña de 12 caracteres: aceptada', () => {
    const error = validarPasswordSegura('ClaveSegura#2026', 'operador');
    expect(error).toBeNull();

    const evaluacion = evaluarPasswordSegura('ClaveSegura#2026', 'operador');
    expect(evaluacion.valido).toBe(true);
    expect(evaluacion.esDebil).toBe(false);
    expect(evaluacion.advertencia).toBeNull();
  });

  it('rechaza claves triviales o que contienen el username', () => {
    expect(validarPasswordSegura('Password1234', 'operador')).toMatch(/predecible/);
    expect(validarPasswordSegura('Operador#Seguro2026', 'operador')).toMatch(/usuario/);
  });

  it('Confirmación diferente: rechazada', () => {
    const alta = validarFormularioUsuario({
      ...formularioValido,
      password: 'ClaveSegura#2026',
      confirmPassword: 'OtraClave#2026',
    }, 'crear');
    expect(alta.confirmPassword).toMatch(/no coinciden/);
  });

  it('Producción conserva su política configurada de 12 caracteres y complejidad', () => {
    // En producción (o perfil admin en producción), 4 caracteres se rechazan
    const errorProd4 = validarPasswordSegura('1234', 'operador', { esProduccion: true });
    expect(errorProd4).toMatch(/al menos 12 caracteres/);

    // En producción 8 caracteres se rechazan
    const errorProd8 = validarPasswordSegura('Pass#2026', 'operador', { esProduccion: true });
    expect(errorProd8).toMatch(/al menos 12 caracteres/);

    // En producción 12 caracteres fuertes se aceptan
    const errorProd12 = validarPasswordSegura('ClaveSegura#2026', 'operador', { esProduccion: true });
    expect(errorProd12).toBeNull();
  });

  it('edición no cambia la clave si no se activa la opción', () => {
    const edicion = validarFormularioUsuario({
      ...formularioValido,
      password: '',
      confirmPassword: '',
      requierePassword: false,
    }, 'editar');
    expect(edicion.password).toBeUndefined();
    expect(edicion.confirmPassword).toBeUndefined();
  });
});

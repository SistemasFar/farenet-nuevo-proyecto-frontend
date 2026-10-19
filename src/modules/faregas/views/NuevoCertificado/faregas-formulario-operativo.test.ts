// @vitest-environment jsdom

import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  descomponerPeriodoFabricacion,
  formatAlfanumericoConEspacios,
  formatPeriodoFabricacion,
  presentarPeriodoFabricacion,
} from '../../utils/vehiculo-formatters';
import {
  formatearConteoDosDigitos,
  manejarNavegacionFormulario,
  normalizarEnteroCertificado,
} from './faregas-formulario-operativo';

const rect = (left: number, top: number): DOMRect => ({
  x: left,
  y: top,
  left,
  top,
  right: left + 100,
  bottom: top + 36,
  width: 100,
  height: 36,
  toJSON: () => ({}),
});

const evento = (
  contenedor: HTMLElement,
  objetivo: HTMLInputElement,
  key: string,
  shiftKey = false,
) => ({
  target: objetivo,
  currentTarget: contenedor,
  key,
  shiftKey,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  preventDefault: vi.fn(),
}) as unknown as React.KeyboardEvent<HTMLElement>;

const crearGrilla = () => {
  const contenedor = document.createElement('div');
  const controles = Array.from({ length: 4 }, () => document.createElement('input'));
  controles.forEach((control, indice) => {
    control.value = `campo-${indice + 1}`;
    const left = indice % 2 === 0 ? 0 : 140;
    const top = indice < 2 ? 0 : 60;
    control.getBoundingClientRect = () => rect(left, top);
    contenedor.appendChild(control);
  });
  document.body.appendChild(contenedor);
  return { contenedor, controles };
};

describe('reglas operativas compartidas de certificados', () => {
  it('conserva sólo enteros y no concatena decimales pegados', () => {
    expect(normalizarEnteroCertificado('1.5')).toBe('1');
    expect(normalizarEnteroCertificado('1,5')).toBe('1');
    expect(normalizarEnteroCertificado('0')).toBe('0');
    expect(normalizarEnteroCertificado('111')).toBe('111');
    expect(normalizarEnteroCertificado('2359')).toBe('2359');
    expect(normalizarEnteroCertificado('1301.000')).toBe('1301');
    expect(normalizarEnteroCertificado('1450.000')).toBe('1450');
    expect(normalizarEnteroCertificado('149.000')).toBe('149');
  });

  it('preserva espacios internos en textos y alfanuméricos', () => {
    expect(formatAlfanumericoConEspacios('TOMASETTO ACHILLE')).toBe('TOMASETTO ACHILLE');
    expect(formatAlfanumericoConEspacios('AT 09')).toBe('AT 09');
    expect(formatAlfanumericoConEspacios('ABC 123')).toBe('ABC 123');
  });

  it('presenta ejes, ruedas, asientos y pasajeros con dos dígitos', () => {
    expect(formatearConteoDosDigitos('1')).toBe('01');
    expect(formatearConteoDosDigitos('2')).toBe('02');
    expect(formatearConteoDosDigitos('10')).toBe('10');
    expect(formatearConteoDosDigitos('')).toBe('');
  });

  it('acepta mes y año del cilindro separados por guion sin mezclar las columnas', () => {
    expect(formatPeriodoFabricacion('05-1999')).toBe('05-1999');
    expect(descomponerPeriodoFabricacion('05-1999')).toEqual({ mes: '05', anio: '1999' });
    expect(descomponerPeriodoFabricacion('1999-05')).toEqual({ mes: '05', anio: '1999' });
    expect(descomponerPeriodoFabricacion('1999')).toEqual({ mes: '', anio: '1999' });
    expect(descomponerPeriodoFabricacion('15-1999')).toEqual({ mes: '', anio: '' });
    expect(presentarPeriodoFabricacion('5', '1999')).toBe('05-1999');
  });

  it('Enter y Shift+Enter recorren los controles editables sin enviar formulario', () => {
    const { contenedor, controles } = crearGrilla();
    controles[0].focus();
    const adelante = evento(contenedor, controles[0], 'Enter');
    manejarNavegacionFormulario(adelante);
    expect(document.activeElement).toBe(controles[1]);
    expect(adelante.preventDefault).toHaveBeenCalled();

    const atras = evento(contenedor, controles[1], 'Enter', true);
    manejarNavegacionFormulario(atras);
    expect(document.activeElement).toBe(controles[0]);
  });

  it('las flechas siguen la posición visual de la grilla', () => {
    const { contenedor, controles } = crearGrilla();
    controles[0].setSelectionRange(controles[0].value.length, controles[0].value.length);
    manejarNavegacionFormulario(evento(contenedor, controles[0], 'ArrowRight'));
    expect(document.activeElement).toBe(controles[1]);

    manejarNavegacionFormulario(evento(contenedor, controles[1], 'ArrowDown'));
    expect(document.activeElement).toBe(controles[3]);

    controles[3].setSelectionRange(0, 0);
    manejarNavegacionFormulario(evento(contenedor, controles[3], 'ArrowLeft'));
    expect(document.activeElement).toBe(controles[2]);

    manejarNavegacionFormulario(evento(contenedor, controles[2], 'ArrowUp'));
    expect(document.activeElement).toBe(controles[0]);
  });

  it('izquierda y derecha no secuestran el cursor dentro del texto', () => {
    const { contenedor, controles } = crearGrilla();
    controles[0].value = 'ABCDE';
    controles[0].focus();
    controles[0].setSelectionRange(2, 2);

    const dentro = evento(contenedor, controles[0], 'ArrowRight');
    manejarNavegacionFormulario(dentro);
    expect(document.activeElement).toBe(controles[0]);
    expect(dentro.preventDefault).not.toHaveBeenCalled();

    controles[0].setSelectionRange(5, 5);
    manejarNavegacionFormulario(evento(contenedor, controles[0], 'ArrowRight'));
    expect(document.activeElement).toBe(controles[1]);
  });

  it('bloquea caracteres decimales y espacios en controles enteros', () => {
    const { contenedor, controles } = crearGrilla();
    controles[0].dataset.tipoDato = 'entero';
    for (const key of ['.', ',', '-', 'e', 'E', ' ']) {
      const keyEvent = evento(contenedor, controles[0], key);
      manejarNavegacionFormulario(keyEvent);
      expect(keyEvent.preventDefault).toHaveBeenCalled();
    }
  });
});

const db = require('../farenetBackend/config/database');

const htmlTaller = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Certificado de Inspección de Taller</title>
    <style>
        @page { size: A4 portrait; margin: 0; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fff;
            position: relative;
            box-sizing: border-box;
            color: #000;
        }
        .documento-certificado {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 20mm 15mm 15mm 15mm;
            margin: 0 auto;
            position: relative;
        }
        .cabecera-legal {
            font-size: 11px;
            margin-bottom: 40px;
            text-align: left;
            line-height: 1.2;
        }
        .titulo-principal {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 30px;
        }
        .sub-header {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 25px;
        }
        .parrafo-certifica {
            font-size: 12px;
            margin-bottom: 15px;
            line-height: 1.4;
            text-align: justify;
        }
        .tabla-info {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
        }
        .tabla-info td {
            border: 1px solid #000;
            padding: 6px 8px;
        }
        .tabla-info td:nth-child(1) {
            width: 5%;
            text-align: center;
        }
        .tabla-info td:nth-child(2) {
            width: 35%;
        }
        .tabla-info td:nth-child(3) {
            width: 60%;
        }
        .seccion-final {
            font-size: 12px;
            line-height: 1.5;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="documento-certificado">
        <!-- Cabecera Legal -->
        <div class="cabecera-legal">
            <div>R.D. N° <span data-faregas-slot="empresa.resolucion">{{empresa.resolucion}}</span></div>
            <div>Domicilio Fiscal: <span data-faregas-slot="empresa.direccion">{{empresa.direccion}}</span></div>
            <div>Celular: <span data-faregas-slot="empresa.telefono">{{empresa.telefono}}</span></div>
        </div>

        <!-- Título -->
        <div class="titulo-principal">
            <span data-faregas-slot="certificado.titulo">{{certificado.titulo}}</span>
        </div>

        <!-- Sub Cabecera -->
        <div class="sub-header">
            <div>Tipo de Certificación: <span data-faregas-slot="certificado.modalidad">{{certificado.modalidad}}</span></div>
            <div>Certificado N° <span data-faregas-slot="certificado.numero">{{certificado.numero}}</span></div>
        </div>

        <!-- Entidad Certificadora -->
        <div class="parrafo-certifica">
            La empresa <span data-faregas-slot="empresa.razon_social">{{empresa.razon_social}}</span> autorizada
            como Entidad Certificadora de Conversión a Gas Natural Vehicular con R.D. N° <span data-faregas-slot="empresa.resolucion">{{empresa.resolucion}}</span>,
        </div>

        <div class="parrafo-certifica">
            <strong>CERTIFICA:</strong> Haber efectuado la inspección del siguiente taller:
        </div>

        <!-- Tabla -->
        <table class="tabla-info">
            <tr>
                <td>1</td>
                <td>Nombre de taller</td>
                <td data-faregas-slot="taller.nombre">{{taller.nombre}}</td>
            </tr>
            <tr>
                <td>2</td>
                <td>Dirección</td>
                <td data-faregas-slot="taller.direccion">{{taller.direccion}}</td>
            </tr>
            <tr>
                <td>3</td>
                <td>Teléfono</td>
                <td data-faregas-slot="taller.telefono">{{taller.telefono}}</td>
            </tr>
            <tr>
                <td>4</td>
                <td>Ciudad</td>
                <td data-faregas-slot="taller.ciudad">{{taller.ciudad}}</td>
            </tr>
            <tr>
                <td>5</td>
                <td>Representante legal</td>
                <td data-faregas-slot="taller.representante_legal">{{taller.representante_legal}}</td>
            </tr>
            <tr>
                <td>6</td>
                <td>N° de autorización</td>
                <td data-faregas-slot="taller.numero_autorizacion">{{taller.numero_autorizacion}}</td>
            </tr>
        </table>

        <!-- Párrafo legal -->
        <div class="parrafo-certifica">
            Habiéndose verificando que su infraestructura inmobiliaria, equipamiento y personal técnico 
            cumple con los requisitos establecidos en las normas legales y técnicas peruanas vigentes en la 
            materia, calificando dicho taller para realizar la conversión y/o reparación del sistema de 
            combustión de los vehículos a Gas Natural Vehicular – GNV tal como se evidencian en los 
            documentos que se anexan a la presente.
        </div>

        <div class="seccion-final">
            <strong>OBSERVACIONES:</strong> <span data-faregas-slot="inspeccion.observaciones">{{inspeccion.observaciones}}</span><br><br>
            Fecha de la próxima inspección anual: <strong data-faregas-slot="inspeccion.fecha_proxima_inspeccion">{{inspeccion.fecha_proxima_inspeccion}}</strong>.<br><br>
            Se expide el presente certificado en la ciudad de Lima, <span data-faregas-slot="certificado.fecha_emision">{{certificado.fecha_emision}}</span>
        </div>
    </div>
</body>
</html>`;

async function run() {
    try {
        console.log('Actualizando v3 de TALLER_INSPECCION...');
        const tRes = await db.query("SELECT id FROM fg_certificado_formato WHERE codigo = 'TALLER_INSPECCION'");
        const formatoId = tRes.rows[0].id;
        
        const vRes = await db.query("SELECT id FROM fg_certificado_formato_version WHERE formato_id = $1 AND version = 3", [formatoId]);
        if (vRes.rowCount > 0) {
            const v3Id = vRes.rows[0].id;
            const config = { html: htmlTaller, css: '', variables: [] };
            await db.query("UPDATE fg_certificado_formato_version SET configuracion = $1 WHERE id = $2", [JSON.stringify(config), v3Id]);
            console.log('v3 Actualizada con éxito.');
        } else {
            console.log('No se encontró la versión 3 de TALLER_INSPECCION.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();

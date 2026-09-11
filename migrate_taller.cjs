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
            <div>R.D. N° {{empresa.resolucion}}</div>
            <div>Domicilio Fiscal: {{empresa.direccion}}</div>
            <div>{{empresa.ciudad}}</div>
            <div>Teléfono: {{empresa.telefono}}</div>
        </div>

        <!-- Título -->
        <div class="titulo-principal">
            CERTIFICADO DE INSPECCIÓN DE TALLER
        </div>

        <!-- Sub Cabecera -->
        <div class="sub-header">
            <div>Tipo de Certificación: {{certificado.modalidad}}</div>
            <div>Certificado N° {{certificado.numero}}</div>
        </div>

        <!-- Entidad Certificadora -->
        <div class="parrafo-certifica">
            La empresa {{empresa.razon_social}}, reconocida como Entidad Certificadora de Gas Licuado del Petróleo – GLP con R.D. N° {{empresa.resolucion}},
        </div>

        <div class="parrafo-certifica">
            <strong>CERTIFICA</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Haber efectuado la inspección del siguiente taller:
        </div>

        <!-- Tabla -->
        <table class="tabla-info">
            <tr>
                <td>1</td>
                <td>Nombre de taller</td>
                <td>{{taller.nombre}}</td>
            </tr>
            <tr>
                <td>2</td>
                <td>Dirección</td>
                <td>{{taller.direccion}}</td>
            </tr>
            <tr>
                <td>3</td>
                <td>Teléfono</td>
                <td>{{taller.telefono}}</td>
            </tr>
            <tr>
                <td>4</td>
                <td>Ciudad</td>
                <td>{{taller.ciudad}}</td>
            </tr>
            <tr>
                <td>5</td>
                <td>Representante legal</td>
                <td>{{taller.representante_legal}}</td>
            </tr>
            <tr>
                <td>6</td>
                <td>N° de autorización</td>
                <td>{{taller.numero_autorizacion}}</td>
            </tr>
        </table>

        <!-- Párrafo legal -->
        <div class="parrafo-certifica">
            Habiéndose verificado que su infraestructura inmobiliaria, equipamiento y personal técnico
            cumple con los requisitos establecidos en las normas legales y técnicas peruanas vigentes en la
            materia, por lo tanto, califica para realizar la conversión y/o reparación del sistema de combustión
            de los vehículos a Gas Licuado del Petróleo – GLP, tal como se evidencian en los documentos que
            se anexan a la presente.
        </div>

        <div class="seccion-final">
            Fecha de la próxima inspección anual: <strong>{{inspeccion.fecha_proxima_inspeccion}}</strong>.<br><br>
            <strong>OBSERVACIONES:</strong> {{inspeccion.observaciones}}<br><br>
            Se expide el presente certificado en la ciudad de Lima, {{certificado.fecha_emision}}
        </div>
    </div>
</body>
</html>`;

async function run() {
    try {
        console.log('Migrando TALLER_INSPECCION a HTML_DINAMICO...');
        const resFormato = await db.query("SELECT id FROM fg_certificado_formato WHERE codigo = 'TALLER_INSPECCION'");
        
        let formatoId;
        if (resFormato.rowCount === 0) {
            console.log('Creando TALLER_INSPECCION...');
            const iRes = await db.query("INSERT INTO fg_certificado_formato (codigo, nombre, motor, es_protegido, activo) VALUES ('TALLER_INSPECCION', 'Inspección de Taller', 'HTML_DINAMICO', false, true) RETURNING id");
            formatoId = iRes.rows[0].id;
        } else {
            formatoId = resFormato.rows[0].id;
            await db.query("UPDATE fg_certificado_formato SET motor = 'HTML_DINAMICO', es_protegido = false WHERE id = $1", [formatoId]);
            console.log('Actualizado TALLER_INSPECCION a HTML_DINAMICO');
        }

        // Crear una nueva versión
        const vRes = await db.query("SELECT COALESCE(MAX(version), 0) + 1 as next_v FROM fg_certificado_formato_version WHERE formato_id = $1", [formatoId]);
        const nextVersion = vRes.rows[0].next_v;

        const config = {
            html: htmlTaller,
            css: '',
            variables: []
        };

        await db.query("INSERT INTO fg_certificado_formato_version (formato_id, version, archivo_ruta, configuracion, estado) VALUES ($1, $2, 'HTML', $3, 'BORRADOR')", 
            [formatoId, nextVersion, JSON.stringify(config)]);

        console.log('Nueva versión HTML_DINAMICO (BORRADOR) creada con éxito.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();

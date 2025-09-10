/*import PDFDocument from 'pdfkit';*/
import moment from 'moment';
import pdfMake from 'pdfmake/build/pdfmake.js';
import * as pdfFonts from 'pdfmake/build/vfs_fonts.js';

pdfMake.vfs = pdfFonts.default;
export class ReportService {
  constructor(app) {
    this.app = app;
  }
  async find(params) {
    try {
      const { query = {} } = params;
      const targetDate = query.date ? moment(query.date) : moment();
      const startOfDay = targetDate.startOf('day').toDate();
      const endOfDay = targetDate.endOf('day').toDate();
      const conversions = await this.getConversionsByDate(startOfDay, endOfDay, query);

      if (conversions.length === 0) {
        throw new Error(`No conversions found for date ${targetDate.format('YYYY-MM-DD')}`);
      }

      const pdfDoc = this.generatePdf(conversions, targetDate);
      return {
        success: true,
        pdfBuffer: pdfDoc,
        fileName: `conversions-${targetDate.format('YYYY-MM-DD')}.pdf`,
        conversionsCount: conversions.length,
        date: targetDate.format('YYYY-MM-DD')
      };

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      throw error;
    }
  }

  generatePdf(conversions, date) {
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: this.addHeader(date, conversions.length),
      content: [
        {
          columns: [
            { text: `Fecha del reporte: ${date.format('DD/MM/YYYY')}`, style: 'subheader' },
            { text: `Total de conversiones: ${conversions.length}`, style: 'subheader', alignment: 'right' }
          ]
        },
        this.addConversionsTable(conversions)
      
      ],
      footer: this.addFooter(),
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        subheader: {
          fontSize: 12,
          margin: [0, 0, 0, 10]
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: 'white',
          fillColor: '#2c5282',
          alignment: 'center'
        },
        evenRow: {
          fillColor: '#f0f9ff'
        },
        oddRow: {
          fillColor: '#ffffff'
        },
        number: {
          alignment: 'right'
        },
        center: {
          alignment: 'center'
        }
      }
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    return pdfDoc;
  }

  addHeader(date, totalConversions) {
    return {
      text: 'REPORTE DE CONVERSIONES',
      style: 'header'
    };
  }

  addConversionsTable(conversions) {
    const tableBody = [
      [
        { text: 'Fecha', style: 'tableHeader' },
        { text: 'De', style: 'tableHeader' },
        { text: 'A', style: 'tableHeader' },
        { text: 'Monto', style: 'tableHeader' },
        { text: 'Convertido', style: 'tableHeader' },
        { text: 'Tasa', style: 'tableHeader' }
      ]
    ];
    conversions.forEach((conversion, index) => {
      const rowStyle = index % 2 === 0 ? 'evenRow' : 'oddRow';

      tableBody.push([
        { text: moment(conversion.createdAt).format('HH:mm:ss'), style: ['center', rowStyle] },
        { text: conversion.from, style: ['center', rowStyle] },
        { text: conversion.to, style: ['center', rowStyle] },
        { text: `$${conversion.originalAmount.toFixed(2)}`, style: ['number', rowStyle] },
        { text: `$${conversion.convertedAmount.toFixed(2)}`, style: ['number', rowStyle] },
        { text: conversion.rate.toFixed(4), style: ['number', rowStyle] }
      ]);
    });

    return {
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', '*', '*', '*'],
        body: tableBody
      },
      layout: {
        hLineWidth: function (i, node) {
          return (i === 0 || i === node.table.body.length) ? 1 : 0;
        },
        vLineWidth: function (i, node) {
          return 0;
        },
        paddingLeft: function (i, node) {
          return 8;
        },
        paddingRight: function (i, node) {
          return 8;
        },
        paddingTop: function (i, node) {
          return 4;
        },
        paddingBottom: function (i, node) {
          return 4;
        }
      }
    };
  }

  addFooter() {
    return function (currentPage, pageCount) {
      return {
        text: `Página ${currentPage} de ${pageCount} | Generado el: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
        alignment: 'center',
        fontSize: 8,
        color: '#666666',
        margin: [0, 20, 0, 0]
      };
    };
  }

  async getConversionsByDate(startDate, endDate, query = {}) {
    const db = await this.app.get('mongodbClient');

    const filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      },
      ...query
    };

    delete filter.$limit;
    delete filter.$skip;
    delete filter.$sort;

    return await db.collection('conversions')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async get(filename, params) {
    console.log('Methodo GET Generated PDF report:', result.fileName);
    const result = await this.find(params);
    return {
      ...result,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || result.fileName}"`,
        'Content-Length': result.pdf.length
      }
    };
  }
}


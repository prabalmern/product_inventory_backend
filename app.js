const express = require('express');
const PDFDocument = require('pdfkit');
const { parse } = require('json2csv');
const ExcelJS = require('exceljs');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// data from JSON file
const loadProductData = () => {
    try {
        const filePath = path.join(__dirname, 'products.json');
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileData);
        return data.products;
    } catch (error) {
        console.error('Error loading product data:', error);
        throw new Error('Failed to load product data');
    }
};

const productInventory = loadProductData();

// Get product inventory api
app.get('/api/products', (req, res) => {
    try {
        res.json(productInventory);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch product data' });
    }
});


const getSelectedData = (selectedIds) => {
    return productInventory.filter(product => selectedIds.includes(product.id));
};

// PDF Export
app.post('/export/pdf', (req, res) => {
    try {
        const selectedIds = req.body.selectedIds || [];
        const selectedData = getSelectedData(selectedIds);

        if (selectedData.length === 0) {
            return res.status(400).json({ error: 'No data to export' });
        }

        const doc = new PDFDocument();
        res.setHeader('Content-disposition', 'attachment; filename=data.pdf');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Title
        doc.fontSize(18).text('Product Inventory', { align: 'center' });
        doc.moveDown();

        // Table header
        const tableTop = 100;
        const itemHeight = 20;
        const tableWidth = 520;
        const columnWidths = [100, 220, 100, 100]; // Adjust these as needed
        const headers = ['ID', 'Name', 'Price', 'Quantity'];

        doc.fontSize(12).text(headers[0], 50, tableTop);
        doc.text(headers[1], 150, tableTop);
        doc.text(headers[2], 370, tableTop);
        doc.text(headers[3], 470, tableTop);

        // Draw header line
        doc.moveTo(50, tableTop + 15)
           .lineTo(580, tableTop + 15)
           .stroke();

        // Draw table rows
        let currentY = tableTop + 30;
        selectedData.forEach(item => {
            doc.text(item.id, 50, currentY);
            doc.text(item.name, 150, currentY);
            doc.text(`$${item.price.toFixed(2)}`, 370, currentY);
            doc.text(item.quantity, 470, currentY);

            // Draw line under each row
            doc.moveTo(50, currentY + 15)
               .lineTo(580, currentY + 15)
               .stroke();

            currentY += itemHeight;
        });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// CSV Export
app.post('/export/csv', (req, res) => {
    try {
        const selectedIds = req.body.selectedIds || [];
        const selectedData = getSelectedData(selectedIds);

        if (selectedData.length === 0) {
            return res.status(400).json({ error: 'No data to export' });
        }

        const csv = parse(selectedData);
        res.setHeader('Content-disposition', 'attachment; filename=data.csv');
        res.setHeader('Content-type', 'text/csv');
        res.send(csv);
    } catch (error) {
        console.error('Error generating CSV:', error);
        res.status(500).json({ error: 'Failed to generate CSV' });
    }
});

// XLSX Export
app.post('/export/xlsx', async (req, res) => {
    try {
        const selectedIds = req.body.selectedIds || [];
        const selectedData = getSelectedData(selectedIds);

        if (selectedData.length === 0) {
            return res.status(400).json({ error: 'No data to export' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Product Inventory');

        worksheet.columns = [
            { header: 'ID', key: 'id' },
            { header: 'Name', key: 'name' },
            { header: 'Price', key: 'price' },
            { header: 'Quantity', key: 'quantity' }
        ];

        selectedData.forEach(item => worksheet.addRow(item));

        res.setHeader('Content-disposition', 'attachment; filename=data.xlsx');
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating XLSX:', error);
        res.status(500).json({ error: 'Failed to generate XLSX' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

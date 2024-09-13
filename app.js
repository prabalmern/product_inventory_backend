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

        doc.fontSize(25).text('Product Inventory', { align: 'center' });
        doc.moveDown();

        selectedData.forEach(item => {
            doc.text(`Name: ${item.name}`);
            doc.text(`Price: $${item.price}`);
            doc.text(`Quantity: ${item.quantity}`);
            doc.moveDown();
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

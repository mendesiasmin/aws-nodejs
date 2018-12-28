const fs = require('fs')
const parse = require('csv-parse/lib/sync')
const AWS = require('aws-sdk')
const express = require('express')
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const asyncHandler = require('express-async-handler')
const builder = require('xmlbuilder');
const router = express.Router()

AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient()

router.get('/', (req, res) => {
    res.render('index')
})

router.get('/import', (req, res) => {
    res.render('import', {
        data: {},
        errors: {}
    })
})

router.post('/import', upload.single('csv'), (req, res) => {
    const contents = fs.readFileSync(req.file.path, 'utf-8')
    const data = parse(contents, {columns: true})
    let fail = 0
    data.forEach((item) => {
        docClient.put({
            TableName: 'imobiliaria',
            Item: item
        }, (err, res) => {
            if(err) {
                console.log(err)
                fail++
            }
        })
    })

    if(fail == 0) {
        req.flash('success', 'Arquivo importado com sucesso!')
    } else {
        req.flash('error', 'Falha ao processar '  + fail + ' requisições.')
    }
    res.redirect('/')
})

const getData = () => new Promise(function(resolve, reject) {
    let params = {
        TableName: 'imobiliaria'
    };

    docClient.scan(params, (err, data) => {
        if(err) {
            console.log('ERROR: ' + err)
            reject(err)
        } else {
            resolve(data)
        }
    })
})


const getPhotos = (entry) => {
    let photos = []

    JSON.parse(entry).forEach((photo) => {
        photos.push(photo["S"])
    })

    return photos
}

const to_object = (item) => {
    let details = JSON.parse(item["Details (M)"])
    let type = details["PropertyType"]["S"].split(" ")
    let local = JSON.parse(item["Location (M)"])
    let photos = getPhotos(item["Media (L)"])

    return {
        title: item["Title (S)"],
        code: item["ImobId (S)"],
        type: type[0],
        subtype: type[type.length - 1],
        city: local["City"]["S"],
        state: local["State"]["M"]["$"]["M"]["abbreviation"]["S"],
        neighboard: local["Neighborhood"]["S"],
        address: local["Address"]["S"],
        number: details["UnitNumber"]["S"],
        postalCode: local["PostalCode"]["S"],
        rentalPrice: details["RentalPrice"]["M"]["_"]["S"],
        area: details["ConstructedArea"]["M"]["_"]["S"],
        metric_unity: details["ConstructedArea"]["M"]["$"]["M"]["currency"]["S"],
        bathroom: details["Bathrooms"]["S"],
        bathroom: details["Description"]["S"],
        photos: photos
    }
}

router.get('/export', asyncHandler(async(req, res) => {
    const data = await getData();
    let items = JSON.stringify(data.Items)
    let xml = builder.create({
        'Carga': {
            "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "@xmlns:xsd": "http://www.w3.org/2001/XMLSchema"
        }
    }, { encoding: 'iso-8859-1' })

    imoveis = xml.ele('Imoveis')

    data.Items.forEach((item) => {
        i = to_object(item)
        imovel = xml.ele('Imovel')
        imovel.ele('CodigoCliente')
        imovel.ele('CodigoImovel', i.code)
        imovel.ele('TipoImovel', i.type)
        imovel.ele('SubTipoImovel', i.subtype)
        imovel.ele('CategoriaImovel')
        imovel.ele('Cidade', i.city)
        imovel.ele('Bairro', i.neighboard)
        imovel.ele('Endereco', i.address)
        imovel.ele('Numero', i.number)
        imovel.ele('CEP', i.postalCode)
        imovel.ele('PrecoLocacao', i.rentalPrice)
        imovel.ele('AreaUtil', i.area)
        imovel.ele('UnidadeMetrica', i.metric_unity)
        imovel.ele('QtdBanheiros', i.bathroom)
        imovel.ele('Observacao', i.description)
        imovel.ele('TipoOferta')
        imovel.ele('UF', i.state)

        let photos = imovel.ele('Fotos')
        i.photos.forEach((p) => {
            photo = photos.ele('Foto')
            photo.ele('NomeArquivo')
            photo.ele('URLArquivo', p)
            photo.ele('Principal')
        })
        imovel.ele('Videos')
    })

    let xmldoc = xml.toString({ pretty: true })
    let dirPath = __dirname + "/tmp/imobiliaria.xml";
    fs.writeFile(dirPath, xmldoc, function(err) {
        if(err) { return console.log(err); }
        res.download(__dirname + '/tmp/imobiliaria.xml')
    });
}))

module.exports = router

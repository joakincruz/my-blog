import express      from 'express';
import bodyParser   from 'body-parser';
import { MongoClient }  from 'mongodb';
import path from 'path';

const app = express();

//Specifying the server where to serve the static content such as images
app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const withDB = async (operations, res) => {
    try {

        //Connecting to the DB
        const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true } );
        const db = client.db('my-blog');

        await operations(db);
     
    
        client.close();
    } catch(error) {
        res.status(500).json({ message: 'Error connecting to db', error })
    }
}


//We need to use async as inside our method we use await several times
app.get('/api/articles/:name', async (req, res) => {
    withDB(async (db) => {
        const articleName = req.params.name;

        //Sending the query to the DB
        const articleInfo = await db.collection('articles').findOne({ name: articleName });
    
        //Sending back the response
        //We could use send(articleInfo) but it's better if we use json for performance. Works a little better when we are dealing with JSON 
        res.status(200).json(articleInfo);
    }, res);
});

app.post('/api/articles/:name/upvote', async (req,res) => {
    
    withDB(async (db) => {
        const articleName = req.params.name;

        //Finding the article we want to update
        const articleInfo = await db.collection('articles').findOne({ name: articleName });
    
        //Updating the votes
        await db.collection('articles').updateOne({ name: articleName }, {
            '$set': {
                upvotes: articleInfo.upvotes + 1,
            }, 
        });
    
        //Retrieving the object recently updated
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });
    
        res.status(200).json(updatedArticleInfo);
    }, res);
});

app.post('/api/articles/:name/add-comment', (req, res) => {
    const { username, text } = req.body;
    const articleName = req.params.name;

    withDB(async (db) => {
        const articleInfo = await db.collection('articles').findOne({ name: articleName });

        await db.collection('articles').updateOne({ name: articleName  }, {
            '$set': {
                comments: articleInfo.comments.concat({ username, text }),
            },
        });
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName  });

        res.status(200).json(updatedArticleInfo);

    }, res);
});

app.get('*', (req,res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'));
});

app.listen(8000, () => console.log('Listening on port 8000'));

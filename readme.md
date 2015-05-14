# Bookshelf paginator

bookshelf-paginator allow paginate your models with ease.

This library depends of `bookshelf-model-loader` and `bookshelf`.

This library help you create paginated lists, simple connected without adding extra data to the response body.
Allowing popular response headers easily, the headers are customizables, here the complete default options
```
{
headers: {
  total: 'X-Total',
  limit: 'X-Limit',
  offset: 'X-Offset'
},
queryStrings: {
  limit: 'limit',
  offset: 'offset'
},
limit: 25,
offset: 0,
filterBy: [],
sortBy: 'id'
}
```

## How to use

### install

    $ npm install --save bookshelf-paginator

### Setup your models
...

### How to use

```
var Paginator = require('pagination');

var paginator = new Paginator('Person', {
  limit: 15,
  filterBy: ['firstname', 'lastname']
});

paginator.paginate().then(function(paginator) {
  paginator.getResults(); // return a person collection
  paginator.getTotal(); // return total register
  paginator.getOffset(); // return offset
  paginator.getLimit(); // return limit
});
```

or use with express

```
app.get('/people', function(req, res) {
  var Paginator = require('pagination');

  var paginator = new Paginator('Person', {
    limit: req.query.limit || 25,
    filterBy: ['firstname', 'lastname']
  });

  paginator.paginate().then(function(paginator) {
    paginator.setHeaders(res);
    res.json(paginator.getResults());
  });
});
```

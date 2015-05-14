# Bookshelf paginator

bookshelf-paginator allow paginate your models with ease.

This library depends of `bookshelf-model-loader` and `bookshelf`


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

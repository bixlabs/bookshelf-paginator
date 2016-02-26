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
sortBy: 'id',
comp: '='
}
```

## How to use

### install

    $ npm install --save bookshelf-paginator

### Setup your models
```
var Language = Models.Bookshelf.Model.extend({
  tableName: 'language'
});

var Person = Models.Bookshelf.Model.extend({
  tableName: 'person',
  languages: function() {
    return this.belongsToMany('Language', 'person_speaks_language', 'person_id', 'language_id');
  },

  getLanguages: function() {
    return this.related('languages');
  },

  getPrimaryLanguage: function() {
    if (this.getLanguages().size()) {
      return this.getLanguages().at(0).get('name');
    }
  },

  toJSON: function() {
    return {
      fullname: [this.get('firstname'), ' ', this.get('lastname')].join(' ').trim(),
      primaryLanguage: this.getPrimaryLanguage()
    };
  }
});

```

### How to use

```
var Paginator = require('bookshelf-paginator');

var paginator = new Paginator('Person', {
  limit: 15,
  filterBy: ['firstname', 'lastname']
});

paginator.paginate().then(function(paginator) {
  paginator.getData(); // return a person collection
  paginator.getTotal(); // return total register
  paginator.getOffset(); // return offset
  paginator.getLimit(); // return limit
});
```

or use with express

```
var Paginator = require('bookshelf-paginator');

app.get('/people', function(req, res) {
  var paginator = new Paginator('Person', {
    limit: req.query.limit || 25,
    filterBy: ['firstname', 'lastname']
  });

  paginator.paginate().then(function(paginator) {
    paginator.setHeaders(res);
    res.json(paginator.getData());
  });
});
```

Filter and sort by related fields

```
var Paginator = require('bookshelf-paginator');

var paginator = new Paginator('Person', {
  limit: 15,
  filterBy: ['firstname', 'lastname', 'languages.name']
});

paginator.paginate({'languages.name': 'Spanish', 'sortBy': '-lastname'}).then(function(paginator) {
  paginator.getData(); // return a person collection
  paginator.getTotal(); // return total register
  paginator.getOffset(); // return offset
  paginator.getLimit(); // return limit
});
```

var immutable = require('immutable');

/**
 * Represents a commit author
 */
var Author = immutable.Record({
    name: String(),
    email: String(),
    date: new Date()
});

// ---- Properties Getter ----
Author.prototype.getName = function() {
    return this.get('name');
};

Author.prototype.getEmail = function() {
    return this.get('email');
};

Author.prototype.getDate = function() {
    return this.get('date');
};

// ---- Statics

/**
 * Create a new author
 * @param {String}
 * @param {String}
 * @param {Date}
 * @return {Author}
 */
Author.create = function createAuthor(name, email, date) {
    return new Author({
        name: name,
        email: email,
        date: date || new Date()
    });
};

module.exports = Author;

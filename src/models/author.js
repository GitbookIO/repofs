const Immutable = require('immutable');

/**
 * Represents a commit author
 */
const Author = Immutable.Record({
    name: String(),
    email: String(),
    date: new Date(),
    avatar: String() // url
}, 'Author');

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

Author.prototype.getAvatar = function() {
    return this.get('avatar');
};

// ---- Statics

/**
 * Create a new author
 * @param {String}
 * @param {String}
 * @param {Date}
 * @param {String} avatar
 * @return {Author}
 */
Author.create = function createAuthor(name, email, date, avatar) {
    return new Author({
        name,
        email,
        date: date || new Date(),
        avatar: avatar || ''
    });
};


module.exports = Author;

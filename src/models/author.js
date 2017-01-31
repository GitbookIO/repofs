const { Record } = require('immutable');

const DEFAULTS = {
    name:   String(),
    email:  String(),
    date:   new Date(),
    avatar: String() // url
};

/**
 * Represents a commit author.
 * @type {Class}
 */
class Author extends Record(DEFAULTS) {
    // ---- Properties Getter ----
    getName() {
        return this.get('name');
    }

    getEmail() {
        return this.get('email');
    }

    getDate() {
        return this.get('date');
    }

    getAvatar() {
        return this.get('avatar');
    }

    // ---- Statics

    /**
     * Create a new author
     * @param {String}
     * @param {String}
     * @param {Date}
     * @param {String} avatar
     * @return {Author}
     */
    static create(name, email, date, avatar) {
        return new Author({
            name,
            email,
            date: date || new Date(),
            avatar: avatar || ''
        });
    }

    static encode(author) {
        return author.toJS();
    }

    static decode(json) {
        const { name, email, date, avatar } = json;
        return Author.create(name, email, date, avatar);
    }
}

module.exports = Author;

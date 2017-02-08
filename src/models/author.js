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
     * @param {Object} infos
     * @return {Author}
     */
    static create(opts) {
        if (opts instanceof Author) {
            return opts;
        }

        return new Author({
            name: opts.name,
            email: opts.email,
            avatar: opts.avatar,
            date: new Date(opts.date)
        });
    }

    static encode(author) {
        return author.toJS();
    }

    static decode(json) {
        return Author.create(json);
    }
}

module.exports = Author;

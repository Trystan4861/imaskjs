import Masked from './base';
import IMask from '../core/holder';
// from https://stackoverflow.com/questions/22483214/regex-check-if-input-still-has-chances-to-become-matching/41580048#41580048
class RegExpPartializer {
    r;
    s = '';
    i = 0;
    constructor(r) { this.r = r; }
    process() {
        this.i = 0;
        this.s = this.r.source;
        return new RegExp(this._processGroup(), this.r.flags);
    }
    _processRaw(count) {
        const result = this.s.substr(this.i, count);
        this.i += count;
        return result;
    }
    _processOptional(count) {
        const result = '(?:' + this.s.substr(this.i, count) + '|$)';
        this.i += count;
        return result;
    }
    _processGroup() {
        let result = '';
        while (this.i < this.s.length) {
            switch (this.s[this.i]) {
                case '\\':
                    switch (this.s[this.i + 1]) {
                        case 'c':
                            result += this._processOptional(3);
                            break;
                        case 'x':
                            result += this._processOptional(4);
                            break;
                        case 'u':
                            if (this.r.unicode) {
                                if (this.s[this.i + 2] === '{') {
                                    result += this._processOptional(this.s.indexOf('}', this.i) - this.i + 1);
                                }
                                else {
                                    result += this._processOptional(6);
                                }
                            }
                            else {
                                result += this._processOptional(2);
                            }
                            break;
                        case 'p':
                        case 'P':
                            if (this.r.unicode) {
                                result += this._processOptional(this.s.indexOf('}', this.i) - this.i + 1);
                            }
                            else {
                                result += this._processOptional(2);
                            }
                            break;
                        case 'k':
                            result += this._processOptional(this.s.indexOf('>', this.i) - this.i + 1);
                            break;
                        default:
                            result += this._processOptional(2);
                            break;
                    }
                    break;
                case '[': {
                    const charSet = /\[(?:\\.|.)*?\]/g;
                    charSet.lastIndex = this.i;
                    const charMatch = charSet.exec(this.s);
                    result += this._processOptional(charMatch?.[0].length ?? 1);
                    break;
                }
                case '|':
                case '^':
                case '$':
                case '*':
                case '+':
                case '?':
                    result += this._processRaw(1);
                    break;
                case '{': {
                    const rangeSet = /\{\d+,?\d*\}/g;
                    rangeSet.lastIndex = this.i;
                    const rangeMatch = rangeSet.exec(this.s);
                    if (rangeMatch) {
                        result += this._processRaw(rangeMatch[0].length);
                    }
                    else {
                        result += this._processOptional(1);
                    }
                    break;
                }
                case '(':
                    if (this.s[this.i + 1] == '?') {
                        switch (this.s[this.i + 2]) {
                            case ':':
                            case '=':
                                result += this._processRaw(3) + this._processGroup() + '|$)';
                                break;
                            case '!': {
                                const gStart = this.i;
                                this.i += 3;
                                this._processGroup();
                                result += this.s.substr(gStart, this.i - gStart);
                                break;
                            }
                            case '<':
                                switch (this.s[this.i + 3]) {
                                    case '=':
                                    case '!': {
                                        const gStart = this.i;
                                        this.i += 4;
                                        this._processGroup();
                                        result += this.s.substr(gStart, this.i - gStart);
                                        break;
                                    }
                                    default:
                                        result += this._processRaw(this.s.indexOf('>', this.i) - this.i + 1) +
                                            this._processGroup() +
                                            '|$)';
                                        break;
                                }
                                break;
                        }
                    }
                    else {
                        result += this._processRaw(1) + this._processGroup() + '|$)';
                    }
                    break;
                case ')':
                    ++this.i;
                    return result;
                default:
                    result += this._processOptional(1);
                    break;
            }
        }
        return result;
    }
}
/** Masking by RegExp */
export default class MaskedRegExp extends Masked {
    static partialize(r) { return new RegExpPartializer(r).process(); }
    updateOptions(opts) {
        super.updateOptions(opts);
    }
    doValidate(flags) {
        return Boolean(this.value.match(this.mask)) && super.doValidate(flags);
    }
}
IMask.MaskedRegExp = MaskedRegExp;

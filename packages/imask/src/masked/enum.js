import MaskedPattern from './pattern';
import IMask from '../core/holder';
/** Pattern which validates enum values */
export default class MaskedEnum extends MaskedPattern {
    constructor(opts) {
        super(opts); // mask will be created in _update
    }
    updateOptions(opts) {
        super.updateOptions(opts);
    }
    _update(opts) {
        const { enum: _enum, ...eopts } = opts;
        if (_enum) {
            const lengths = _enum.map(e => e.length);
            const requiredLength = Math.min(...lengths);
            const optionalLength = Math.max(...lengths) - requiredLength;
            eopts.mask = '*'.repeat(requiredLength);
            if (optionalLength)
                eopts.mask += '[' + '*'.repeat(optionalLength) + ']';
            this.enum = _enum;
        }
        super._update(eopts);
    }
    doValidate(flags) {
        return this.enum.some(e => e.indexOf(this.unmaskedValue) === 0) &&
            super.doValidate(flags);
    }
}
IMask.MaskedEnum = MaskedEnum;

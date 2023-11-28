import MaskedPattern from './pattern';
import MaskedRange from './range';
import IMask from '../core/holder';
import { isString } from '../core/utils';
/** Date mask */
export default class MaskedDate extends MaskedPattern {
    static GET_DEFAULT_BLOCKS = () => ({
        d: {
            mask: MaskedRange,
            from: 1,
            to: 31,
            maxLength: 2,
        },
        m: {
            mask: MaskedRange,
            from: 1,
            to: 12,
            maxLength: 2,
        },
        Y: {
            mask: MaskedRange,
            from: 1900,
            to: 9999,
        }
    });
    static DEFAULTS = {
        mask: Date,
        pattern: 'd{.}`m{.}`Y',
        format: (date, masked) => {
            if (!date)
                return '';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return [day, month, year].join('.');
        },
        parse: (str, masked) => {
            const [day, month, year] = str.split('.').map(Number);
            return new Date(year, month - 1, day);
        },
    };
    constructor(opts) {
        const { mask, pattern, ...patternOpts } = {
            ...MaskedDate.DEFAULTS,
            ...opts,
        };
        super({
            ...patternOpts,
            mask: isString(mask) ? mask : pattern,
        });
    }
    updateOptions(opts) {
        super.updateOptions(opts);
    }
    _update(opts) {
        const { mask, pattern, blocks, ...patternOpts } = {
            ...MaskedDate.DEFAULTS,
            ...opts,
        };
        const patternBlocks = Object.assign({}, MaskedDate.GET_DEFAULT_BLOCKS());
        // adjust year block
        if (opts.min)
            patternBlocks.Y.from = opts.min.getFullYear();
        if (opts.max)
            patternBlocks.Y.to = opts.max.getFullYear();
        if (opts.min && opts.max && patternBlocks.Y.from === patternBlocks.Y.to) {
            patternBlocks.m.from = opts.min.getMonth() + 1;
            patternBlocks.m.to = opts.max.getMonth() + 1;
            if (patternBlocks.m.from === patternBlocks.m.to) {
                patternBlocks.d.from = opts.min.getDate();
                patternBlocks.d.to = opts.max.getDate();
            }
        }
        Object.assign(patternBlocks, this.blocks, blocks);
        // add autofix
        Object.keys(patternBlocks).forEach(bk => {
            const b = patternBlocks[bk];
            if (!('autofix' in b) && 'autofix' in opts)
                b.autofix = opts.autofix;
        });
        super._update({
            ...patternOpts,
            mask: isString(mask) ? mask : pattern,
            blocks: patternBlocks,
        });
    }
    doValidate(flags) {
        const date = this.date;
        return super.doValidate(flags) &&
            (!this.isComplete ||
                this.isDateExist(this.value) && date != null &&
                    (this.min == null || this.min <= date) &&
                    (this.max == null || date <= this.max));
    }
    /** Checks if date is exists */
    isDateExist(str) {
        return this.format(this.parse(str, this), this).indexOf(str) >= 0;
    }
    /** Parsed Date */
    get date() {
        return this.typedValue;
    }
    set date(date) {
        this.typedValue = date;
    }
    get typedValue() {
        return this.isComplete ? super.typedValue : null;
    }
    set typedValue(value) {
        super.typedValue = value;
    }
    maskEquals(mask) {
        return mask === Date || super.maskEquals(mask);
    }
}
IMask.MaskedDate = MaskedDate;

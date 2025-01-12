import ChangeDetails from '../core/change-details';
import ContinuousTailDetails from '../core/continuous-tail-details';
import { DIRECTION, isString, forceDirection } from '../core/utils';
import IMask from '../core/holder';
/** Provides common masking stuff */
export default class Masked {
    static DEFAULTS = {
        skipInvalid: true,
    };
    static EMPTY_VALUES = [undefined, null, ''];
    constructor(opts) {
        this._value = '';
        this._update({
            ...Masked.DEFAULTS,
            ...opts,
        });
        this._initialized = true;
    }
    /** Sets and applies new options */
    updateOptions(opts) {
        if (!Object.keys(opts).length)
            return;
        this.withValueRefresh(this._update.bind(this, opts));
    }
    /** Sets new options */
    _update(opts) {
        Object.assign(this, opts);
    }
    /** Mask state */
    get state() {
        return {
            _value: this.value,
            _rawInputValue: this.rawInputValue,
        };
    }
    set state(state) {
        this._value = state._value;
    }
    /** Resets value */
    reset() {
        this._value = '';
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this.resolve(value, { input: true });
    }
    /** Resolve new value */
    resolve(value, flags = { input: true }) {
        this.reset();
        this.append(value, flags, '');
        this.doCommit();
    }
    get unmaskedValue() {
        return this.value;
    }
    set unmaskedValue(value) {
        this.resolve(value, {});
    }
    get typedValue() {
        return this.parse ? this.parse(this.value, this) : this.unmaskedValue;
    }
    set typedValue(value) {
        if (this.format) {
            this.value = this.format(value, this);
        }
        else {
            this.unmaskedValue = String(value);
        }
    }
    /** Value that includes raw user input */
    get rawInputValue() {
        return this.extractInput(0, this.displayValue.length, { raw: true });
    }
    set rawInputValue(value) {
        this.resolve(value, { raw: true });
    }
    get displayValue() {
        return this.value;
    }
    get isComplete() {
        return true;
    }
    get isFilled() {
        return this.isComplete;
    }
    /** Finds nearest input position in direction */
    nearestInputPos(cursorPos, direction) {
        return cursorPos;
    }
    totalInputPositions(fromPos = 0, toPos = this.displayValue.length) {
        return Math.min(this.displayValue.length, toPos - fromPos);
    }
    /** Extracts value in range considering flags */
    extractInput(fromPos = 0, toPos = this.displayValue.length, flags) {
        return this.displayValue.slice(fromPos, toPos);
    }
    /** Extracts tail in range */
    extractTail(fromPos = 0, toPos = this.displayValue.length) {
        return new ContinuousTailDetails(this.extractInput(fromPos, toPos), fromPos);
    }
    /** Appends tail */
    appendTail(tail) {
        if (isString(tail))
            tail = new ContinuousTailDetails(String(tail));
        return tail.appendTo(this);
    }
    /** Appends char */
    _appendCharRaw(ch, flags = {}) {
        if (!ch)
            return new ChangeDetails();
        this._value += ch;
        return new ChangeDetails({
            inserted: ch,
            rawInserted: ch,
        });
    }
    /** Appends char */
    _appendChar(ch, flags = {}, checkTail) {
        const consistentState = this.state;
        let details;
        [ch, details] = this.doPrepareChar(ch, flags);
        if (ch) {
            details = details.aggregate(this._appendCharRaw(ch, flags));
        }
        else if (details.skip == null) {
            details.skip = true;
        }
        if (details.inserted) {
            let consistentTail;
            let appended = this.doValidate(flags) !== false;
            if (appended && checkTail != null) {
                // validation ok, check tail
                const beforeTailState = this.state;
                if (this.overwrite === true) {
                    consistentTail = checkTail.state;
                    checkTail.unshift(this.displayValue.length - details.tailShift);
                }
                let tailDetails = this.appendTail(checkTail);
                appended = tailDetails.rawInserted === checkTail.toString();
                // not ok, try shift
                if (!(appended && tailDetails.inserted) && this.overwrite === 'shift') {
                    this.state = beforeTailState;
                    consistentTail = checkTail.state;
                    checkTail.shift();
                    tailDetails = this.appendTail(checkTail);
                    appended = tailDetails.rawInserted === checkTail.toString();
                }
                // if ok, rollback state after tail
                if (appended && tailDetails.inserted)
                    this.state = beforeTailState;
            }
            // revert all if something went wrong
            if (!appended) {
                details = new ChangeDetails();
                this.state = consistentState;
                if (checkTail && consistentTail)
                    checkTail.state = consistentTail;
            }
        }
        return details;
    }
    /** Appends optional placeholder at the end */
    _appendPlaceholder() {
        return new ChangeDetails();
    }
    /** Appends optional eager placeholder at the end */
    _appendEager() {
        return new ChangeDetails();
    }
    /** Appends symbols considering flags */
    append(str, flags, tail) {
        if (!isString(str))
            throw new Error('value should be string');
        const checkTail = isString(tail) ? new ContinuousTailDetails(String(tail)) : tail;
        if (flags?.tail)
            flags._beforeTailState = this.state;
        let details;
        [str, details] = this.doPrepare(str, flags);
        for (let ci = 0; ci < str.length; ++ci) {
            const d = this._appendChar(str[ci], flags, checkTail);
            if (!d.rawInserted && !this.doSkipInvalid(str[ci], flags, checkTail))
                break;
            details.aggregate(d);
        }
        if ((this.eager === true || this.eager === 'append') && flags?.input && str) {
            details.aggregate(this._appendEager());
        }
        // append tail but aggregate only tailShift
        if (checkTail != null) {
            details.tailShift += this.appendTail(checkTail).tailShift;
            // TODO it's a good idea to clear state after appending ends
            // but it causes bugs when one append calls another (when dynamic dispatch set rawInputValue)
            // this._resetBeforeTailState();
        }
        return details;
    }
    remove(fromPos = 0, toPos = this.displayValue.length) {
        this._value = this.displayValue.slice(0, fromPos) + this.displayValue.slice(toPos);
        return new ChangeDetails();
    }
    /** Calls function and reapplies current value */
    withValueRefresh(fn) {
        if (this._refreshing || !this._initialized)
            return fn();
        this._refreshing = true;
        const rawInput = this.rawInputValue;
        const value = this.value;
        const ret = fn();
        this.rawInputValue = rawInput;
        // append lost trailing chars at the end
        if (this.value && this.value !== value && value.indexOf(this.value) === 0) {
            this.append(value.slice(this.displayValue.length), {}, '');
        }
        delete this._refreshing;
        return ret;
    }
    runIsolated(fn) {
        if (this._isolated || !this._initialized)
            return fn(this);
        this._isolated = true;
        const state = this.state;
        const ret = fn(this);
        this.state = state;
        delete this._isolated;
        return ret;
    }
    doSkipInvalid(ch, flags = {}, checkTail) {
        return Boolean(this.skipInvalid);
    }
    /** Prepares string before mask processing */
    doPrepare(str, flags = {}) {
        return ChangeDetails.normalize(this.prepare ?
            this.prepare(str, this, flags) :
            str);
    }
    /** Prepares each char before mask processing */
    doPrepareChar(str, flags = {}) {
        return ChangeDetails.normalize(this.prepareChar ?
            this.prepareChar(str, this, flags) :
            str);
    }
    /** Validates if value is acceptable */
    doValidate(flags) {
        return (!this.validate || this.validate(this.value, this, flags)) &&
            (!this.parent || this.parent.doValidate(flags));
    }
    /** Does additional processing at the end of editing */
    doCommit() {
        if (this.commit)
            this.commit(this.value, this);
    }
    splice(start, deleteCount, inserted, removeDirection = DIRECTION.NONE, flags = { input: true }) {
        const tailPos = start + deleteCount;
        const tail = this.extractTail(tailPos);
        const eagerRemove = this.eager === true || this.eager === 'remove';
        let oldRawValue;
        if (eagerRemove) {
            removeDirection = forceDirection(removeDirection);
            oldRawValue = this.extractInput(0, tailPos, { raw: true });
        }
        let startChangePos = start;
        const details = new ChangeDetails();
        // if it is just deletion without insertion
        if (removeDirection !== DIRECTION.NONE) {
            startChangePos = this.nearestInputPos(start, deleteCount > 1 && start !== 0 && !eagerRemove ?
                DIRECTION.NONE :
                removeDirection);
            // adjust tailShift if start was aligned
            details.tailShift = startChangePos - start;
        }
        details.aggregate(this.remove(startChangePos));
        if (eagerRemove && removeDirection !== DIRECTION.NONE && oldRawValue === this.rawInputValue) {
            if (removeDirection === DIRECTION.FORCE_LEFT) {
                let valLength;
                while (oldRawValue === this.rawInputValue && (valLength = this.displayValue.length)) {
                    details
                        .aggregate(new ChangeDetails({ tailShift: -1 }))
                        .aggregate(this.remove(valLength - 1));
                }
            }
            else if (removeDirection === DIRECTION.FORCE_RIGHT) {
                tail.unshift();
            }
        }
        return details.aggregate(this.append(inserted, flags, tail));
    }
    maskEquals(mask) {
        return this.mask === mask;
    }
    typedValueEquals(value) {
        const tval = this.typedValue;
        return value === tval ||
            Masked.EMPTY_VALUES.includes(value) && Masked.EMPTY_VALUES.includes(tval) ||
            (this.format ? this.format(value, this) === this.format(this.typedValue, this) : false);
    }
}
IMask.Masked = Masked;

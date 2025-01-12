import ChangeDetails from '../../core/change-details';
import { DIRECTION, isString } from '../../core/utils';
import ContinuousTailDetails from '../../core/continuous-tail-details';
export default class PatternFixedDefinition {
    constructor(opts) {
        Object.assign(this, opts);
        this._value = '';
        this.isFixed = true;
    }
    get value() {
        return this._value;
    }
    get unmaskedValue() {
        return this.isUnmasking ? this.value : '';
    }
    get rawInputValue() {
        return this._isRawInput ? this.value : '';
    }
    get displayValue() {
        return this.value;
    }
    reset() {
        this._isRawInput = false;
        this._value = '';
    }
    remove(fromPos = 0, toPos = this._value.length) {
        this._value = this._value.slice(0, fromPos) + this._value.slice(toPos);
        if (!this._value)
            this._isRawInput = false;
        return new ChangeDetails();
    }
    nearestInputPos(cursorPos, direction = DIRECTION.NONE) {
        const minPos = 0;
        const maxPos = this._value.length;
        switch (direction) {
            case DIRECTION.LEFT:
            case DIRECTION.FORCE_LEFT:
                return minPos;
            case DIRECTION.NONE:
            case DIRECTION.RIGHT:
            case DIRECTION.FORCE_RIGHT:
            default:
                return maxPos;
        }
    }
    totalInputPositions(fromPos = 0, toPos = this._value.length) {
        return this._isRawInput ? (toPos - fromPos) : 0;
    }
    extractInput(fromPos = 0, toPos = this._value.length, flags = {}) {
        return flags.raw && this._isRawInput && this._value.slice(fromPos, toPos) || '';
    }
    get isComplete() {
        return true;
    }
    get isFilled() {
        return Boolean(this._value);
    }
    _appendChar(ch, flags = {}) {
        const details = new ChangeDetails();
        if (this.isFilled)
            return details;
        const appendEager = this.eager === true || this.eager === 'append';
        const appended = this.char === ch;
        const isResolved = appended && (this.isUnmasking || flags.input || flags.raw) && (!flags.raw || !appendEager) && !flags.tail;
        if (isResolved)
            details.rawInserted = this.char;
        this._value = details.inserted = this.char;
        this._isRawInput = isResolved && (flags.raw || flags.input);
        return details;
    }
    _appendEager() {
        return this._appendChar(this.char, { tail: true });
    }
    _appendPlaceholder() {
        const details = new ChangeDetails();
        if (this.isFilled)
            return details;
        this._value = details.inserted = this.char;
        return details;
    }
    extractTail() {
        return new ContinuousTailDetails('');
    }
    appendTail(tail) {
        if (isString(tail))
            tail = new ContinuousTailDetails(String(tail));
        return tail.appendTo(this);
    }
    append(str, flags, tail) {
        const details = this._appendChar(str[0], flags);
        if (tail != null) {
            details.tailShift += this.appendTail(tail).tailShift;
        }
        return details;
    }
    doCommit() { }
    get state() {
        return {
            _value: this._value,
            _rawInputValue: this.rawInputValue,
        };
    }
    set state(state) {
        this._value = state._value;
        this._isRawInput = Boolean(state._rawInputValue);
    }
}

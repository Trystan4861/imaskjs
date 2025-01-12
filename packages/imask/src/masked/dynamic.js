import { objectIncludes } from '../core/utils';
import ChangeDetails from '../core/change-details';
import createMask, { normalizeOpts } from './factory';
import Masked from './base';
import { DIRECTION } from '../core/utils';
import IMask from '../core/holder';
/** Dynamic mask for choosing appropriate mask in run-time */
export default class MaskedDynamic extends Masked {
    static DEFAULTS;
    constructor(opts) {
        super({
            ...MaskedDynamic.DEFAULTS,
            ...opts
        });
        this.currentMask = undefined;
    }
    updateOptions(opts) {
        super.updateOptions(opts);
    }
    _update(opts) {
        super._update(opts);
        if ('mask' in opts) {
            this.exposeMask = undefined;
            // mask could be totally dynamic with only `dispatch` option
            this.compiledMasks = Array.isArray(opts.mask) ?
                opts.mask.map(m => {
                    const { expose, ...maskOpts } = normalizeOpts(m);
                    const masked = createMask({
                        overwrite: this._overwrite,
                        eager: this._eager,
                        skipInvalid: this._skipInvalid,
                        ...maskOpts,
                    });
                    if (expose)
                        this.exposeMask = masked;
                    return masked;
                }) :
                [];
            // this.currentMask = this.doDispatch(''); // probably not needed but lets see
        }
    }
    _appendCharRaw(ch, flags = {}) {
        const details = this._applyDispatch(ch, flags);
        if (this.currentMask) {
            details.aggregate(this.currentMask._appendChar(ch, this.currentMaskFlags(flags)));
        }
        return details;
    }
    _applyDispatch(appended = '', flags = {}, tail = '') {
        const prevValueBeforeTail = flags.tail && flags._beforeTailState != null ?
            flags._beforeTailState._value :
            this.value;
        const inputValue = this.rawInputValue;
        const insertValue = flags.tail && flags._beforeTailState != null ?
            flags._beforeTailState._rawInputValue :
            inputValue;
        const tailValue = inputValue.slice(insertValue.length);
        const prevMask = this.currentMask;
        const details = new ChangeDetails();
        const prevMaskState = prevMask?.state;
        // clone flags to prevent overwriting `_beforeTailState`
        this.currentMask = this.doDispatch(appended, { ...flags }, tail);
        // restore state after dispatch
        if (this.currentMask) {
            if (this.currentMask !== prevMask) {
                // if mask changed reapply input
                this.currentMask.reset();
                if (insertValue) {
                    const d = this.currentMask.append(insertValue, { raw: true });
                    details.tailShift = d.inserted.length - prevValueBeforeTail.length;
                }
                if (tailValue) {
                    details.tailShift += this.currentMask.append(tailValue, { raw: true, tail: true }).tailShift;
                }
            }
            else if (prevMaskState) {
                // Dispatch can do something bad with state, so
                // restore prev mask state
                this.currentMask.state = prevMaskState;
            }
        }
        return details;
    }
    _appendPlaceholder() {
        const details = this._applyDispatch();
        if (this.currentMask) {
            details.aggregate(this.currentMask._appendPlaceholder());
        }
        return details;
    }
    _appendEager() {
        const details = this._applyDispatch();
        if (this.currentMask) {
            details.aggregate(this.currentMask._appendEager());
        }
        return details;
    }
    appendTail(tail) {
        const details = new ChangeDetails();
        if (tail)
            details.aggregate(this._applyDispatch('', {}, tail));
        return details.aggregate(this.currentMask ?
            this.currentMask.appendTail(tail) :
            super.appendTail(tail));
    }
    currentMaskFlags(flags) {
        return {
            ...flags,
            _beforeTailState: flags._beforeTailState?.currentMaskRef === this.currentMask &&
                flags._beforeTailState?.currentMask ||
                flags._beforeTailState,
        };
    }
    doDispatch(appended, flags = {}, tail = '') {
        return this.dispatch(appended, this, flags, tail);
    }
    doValidate(flags) {
        return super.doValidate(flags) && (!this.currentMask || this.currentMask.doValidate(this.currentMaskFlags(flags)));
    }
    doPrepare(str, flags = {}) {
        let [s, details] = super.doPrepare(str, flags);
        if (this.currentMask) {
            let currentDetails;
            ([s, currentDetails] = super.doPrepare(s, this.currentMaskFlags(flags)));
            details = details.aggregate(currentDetails);
        }
        return [s, details];
    }
    doPrepareChar(str, flags = {}) {
        let [s, details] = super.doPrepareChar(str, flags);
        if (this.currentMask) {
            let currentDetails;
            ([s, currentDetails] = super.doPrepareChar(s, this.currentMaskFlags(flags)));
            details = details.aggregate(currentDetails);
        }
        return [s, details];
    }
    reset() {
        this.currentMask?.reset();
        this.compiledMasks.forEach(m => m.reset());
    }
    get value() {
        return this.exposeMask ? this.exposeMask.value :
            this.currentMask ? this.currentMask.value :
                '';
    }
    set value(value) {
        if (this.exposeMask) {
            this.exposeMask.value = value;
            this.currentMask = this.exposeMask;
            this._applyDispatch();
        }
        else
            super.value = value;
    }
    get unmaskedValue() {
        return this.exposeMask ? this.exposeMask.unmaskedValue :
            this.currentMask ? this.currentMask.unmaskedValue :
                '';
    }
    set unmaskedValue(unmaskedValue) {
        if (this.exposeMask) {
            this.exposeMask.unmaskedValue = unmaskedValue;
            this.currentMask = this.exposeMask;
            this._applyDispatch();
        }
        else
            super.unmaskedValue = unmaskedValue;
    }
    get typedValue() {
        return this.exposeMask ? this.exposeMask.typedValue :
            this.currentMask ? this.currentMask.typedValue :
                '';
    }
    set typedValue(typedValue) {
        if (this.exposeMask) {
            this.exposeMask.typedValue = typedValue;
            this.currentMask = this.exposeMask;
            this._applyDispatch();
            return;
        }
        let unmaskedValue = String(typedValue);
        // double check it
        if (this.currentMask) {
            this.currentMask.typedValue = typedValue;
            unmaskedValue = this.currentMask.unmaskedValue;
        }
        this.unmaskedValue = unmaskedValue;
    }
    get displayValue() {
        return this.currentMask ? this.currentMask.displayValue : '';
    }
    get isComplete() {
        return Boolean(this.currentMask?.isComplete);
    }
    get isFilled() {
        return Boolean(this.currentMask?.isFilled);
    }
    remove(fromPos, toPos) {
        const details = new ChangeDetails();
        if (this.currentMask) {
            details.aggregate(this.currentMask.remove(fromPos, toPos))
                // update with dispatch
                .aggregate(this._applyDispatch());
        }
        return details;
    }
    get state() {
        return {
            ...super.state,
            _rawInputValue: this.rawInputValue,
            compiledMasks: this.compiledMasks.map(m => m.state),
            currentMaskRef: this.currentMask,
            currentMask: this.currentMask?.state,
        };
    }
    set state(state) {
        const { compiledMasks, currentMaskRef, currentMask, ...maskedState } = state;
        if (compiledMasks)
            this.compiledMasks.forEach((m, mi) => m.state = compiledMasks[mi]);
        if (currentMaskRef != null) {
            this.currentMask = currentMaskRef;
            this.currentMask.state = currentMask;
        }
        super.state = maskedState;
    }
    extractInput(fromPos, toPos, flags) {
        return this.currentMask ?
            this.currentMask.extractInput(fromPos, toPos, flags) :
            '';
    }
    extractTail(fromPos, toPos) {
        return this.currentMask ?
            this.currentMask.extractTail(fromPos, toPos) :
            super.extractTail(fromPos, toPos);
    }
    doCommit() {
        if (this.currentMask)
            this.currentMask.doCommit();
        super.doCommit();
    }
    nearestInputPos(cursorPos, direction) {
        return this.currentMask ?
            this.currentMask.nearestInputPos(cursorPos, direction) :
            super.nearestInputPos(cursorPos, direction);
    }
    get overwrite() {
        return this.currentMask ?
            this.currentMask.overwrite :
            this._overwrite;
    }
    set overwrite(overwrite) {
        this._overwrite = overwrite;
    }
    get eager() {
        return this.currentMask ?
            this.currentMask.eager :
            this._eager;
    }
    set eager(eager) {
        this._eager = eager;
    }
    get skipInvalid() {
        return this.currentMask ?
            this.currentMask.skipInvalid :
            this._skipInvalid;
    }
    set skipInvalid(skipInvalid) {
        this._skipInvalid = skipInvalid;
    }
    maskEquals(mask) {
        return Array.isArray(mask) ?
            this.compiledMasks.every((m, mi) => {
                if (!mask[mi])
                    return;
                const { mask: oldMask, ...restOpts } = mask[mi];
                return objectIncludes(m, restOpts) && m.maskEquals(oldMask);
            }) : super.maskEquals(mask);
    }
    typedValueEquals(value) {
        return Boolean(this.currentMask?.typedValueEquals(value));
    }
}
MaskedDynamic.DEFAULTS = {
    dispatch: (appended, masked, flags, tail) => {
        if (!masked.compiledMasks.length)
            return;
        const inputValue = masked.rawInputValue;
        // simulate input
        const inputs = masked.compiledMasks.map((m, index) => {
            const isCurrent = masked.currentMask === m;
            const startInputPos = isCurrent ? m.displayValue.length : m.nearestInputPos(m.displayValue.length, DIRECTION.FORCE_LEFT);
            if (m.rawInputValue !== inputValue) {
                m.reset();
                m.append(inputValue, { raw: true });
            }
            else if (!isCurrent) {
                m.remove(startInputPos);
            }
            m.append(appended, masked.currentMaskFlags(flags));
            m.appendTail(tail);
            return {
                index,
                weight: m.rawInputValue.length,
                totalInputPositions: m.totalInputPositions(0, Math.max(startInputPos, m.nearestInputPos(m.displayValue.length, DIRECTION.FORCE_LEFT))),
            };
        });
        // pop masks with longer values first
        inputs.sort((i1, i2) => i2.weight - i1.weight || i2.totalInputPositions - i1.totalInputPositions);
        return masked.compiledMasks[inputs[0].index];
    }
};
IMask.MaskedDynamic = MaskedDynamic;

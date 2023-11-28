/** Provides details of continuous extracted tail */
export default class ContinuousTailDetails {
    constructor(value = '', from = 0, stop) {
        this.value = value;
        this.from = from;
        this.stop = stop;
    }
    toString() { return this.value; }
    extend(tail) {
        this.value += String(tail);
    }
    appendTo(masked) {
        return masked.append(this.toString(), { tail: true })
            .aggregate(masked._appendPlaceholder());
    }
    get state() {
        return {
            value: this.value,
            from: this.from,
            stop: this.stop,
        };
    }
    set state(state) {
        Object.assign(this, state);
    }
    unshift(beforePos) {
        if (!this.value.length || (beforePos != null && this.from >= beforePos))
            return '';
        const shiftChar = this.value[0];
        this.value = this.value.slice(1);
        return shiftChar;
    }
    shift() {
        if (!this.value.length)
            return '';
        const shiftChar = this.value[this.value.length - 1];
        this.value = this.value.slice(0, -1);
        return shiftChar;
    }
}

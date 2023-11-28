import HTMLMaskElement from './html-mask-element';
import IMask from '../core/holder';
/** Bridge between InputElement and {@link Masked} */
export default class HTMLInputMaskElement extends HTMLMaskElement {
    constructor(input) {
        super(input);
        this.input = input;
        this._handlers = {};
    }
    /** Returns InputElement selection start */
    get _unsafeSelectionStart() {
        return this.input.selectionStart != null ? this.input.selectionStart : this.value.length;
    }
    /** Returns InputElement selection end */
    get _unsafeSelectionEnd() {
        return this.input.selectionEnd;
    }
    /** Sets InputElement selection */
    _unsafeSelect(start, end) {
        this.input.setSelectionRange(start, end);
    }
    get value() {
        return this.input.value;
    }
    set value(value) {
        this.input.value = value;
    }
}
IMask.HTMLMaskElement = HTMLMaskElement;

import Masked from './base';
import IMask from '../core/holder';
/** Masking by custom Function */
export default class MaskedFunction extends Masked {
    updateOptions(opts) {
        super.updateOptions(opts);
    }
    _update(opts) {
        super._update({
            ...opts,
            validate: opts.mask,
        });
    }
}
IMask.MaskedFunction = MaskedFunction;

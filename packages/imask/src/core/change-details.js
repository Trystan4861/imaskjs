import IMask from "./holder";
/** Provides details of changing model value */
export default class ChangeDetails {
    static normalize(prep) {
        return Array.isArray(prep) ? prep : [
            prep,
            new ChangeDetails(),
        ];
    }
    constructor(details) {
        Object.assign(this, {
            inserted: '',
            rawInserted: '',
            tailShift: 0,
        }, details);
    }
    /** Aggregate changes */
    aggregate(details) {
        this.rawInserted += details.rawInserted;
        this.skip = this.skip || details.skip;
        this.inserted += details.inserted;
        this.tailShift += details.tailShift;
        return this;
    }
    /** Total offset considering all changes */
    get offset() {
        return this.tailShift + this.inserted.length;
    }
}
IMask.ChangeDetails = ChangeDetails;

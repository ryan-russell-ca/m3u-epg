class BaseFile<
  T extends {
    date?: Date;
    id?: string;
  }
> {
  protected _loaded = false;
  protected _expired = false;
  protected _expirationMilli: number = 0;
  protected _model?: T;

  public get id() {
    return this.model?.id;
  }

  public get isLoaded() {
    return this._loaded;
  }

  protected get expired() {
    return this._expired;
  }

  protected get model() {
    if (this._model && this.checkExpired(this._model)) {
      this._expired = true;
    }

    return this._model;
  }

  protected checkExpired = (model: T) => {
    return (
      (model?.date?.getTime() || 0) + this._expirationMilli - 1 < Date.now()
    );
  };
}

export default BaseFile;

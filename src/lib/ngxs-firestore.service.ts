import { QueryFn, QueryDocumentSnapshot } from '@angular/fire/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { Inject, Injectable } from '@angular/core';
import { map, mapTo, timeoutWith } from 'rxjs/operators';
import { NgxsFirestoreAdapter } from './ngxs-firestore.adapter';
import firebase from 'firebase/app';
import 'firebase/firestore';

/**
 * Changes the behavior of a set() call to only replace the values specified
 * in its data argument. Fields omitted from the set() call remain
 * untouched.
 */

@Injectable()
export abstract class NgxsFirestore<T> {
  constructor(@Inject(NgxsFirestoreAdapter) protected adapter: NgxsFirestoreAdapter) {}

  protected abstract path: string;
  protected idField: string = 'id';

  protected converter = {
    toFirestore: (value) => {
      return value;
    },
    fromFirestore: (snapshot, options) => {
      return { ...(<T>snapshot.data(options)) };
    }
  };

  public createId() {
    return this.adapter.firestore.createId();
  }

  public doc$(id: string): Observable<T> {
    return this.adapter.firestore
      .doc<T>(this.docRef(id))
      .snapshotChanges()
      .pipe(
        map((docSnapshot: any) => {
          if (docSnapshot.payload.exists) {
            return this.getDataWithId(docSnapshot.payload);
          } else {
            return undefined;
          }
        })
      );
  }

  public docOnce$(id: string, getOptions: firebase.firestore.GetOptions = { source: 'default' }): Observable<T> {
    return this.adapter.firestore
      .doc<T>(this.docRef(id))
      .get(getOptions)
      .pipe(
        map((docSnapshot) => {
          if (docSnapshot.exists) {
            return this.getDataWithId(docSnapshot);
          } else {
            return undefined;
          }
        })
      );
  }

  public collection$(queryFn: QueryFn = (ref) => ref): Observable<T[]> {
    return this.adapter.firestore
      .collection<T>(this.path, (ref) => {
        return queryFn(ref.withConverter(this.converter));
      })
      .snapshotChanges()
      .pipe(
        map((docSnapshots) =>
          docSnapshots.map((docSnapshot) => {
            return this.getDataWithId(docSnapshot.payload.doc);
          })
        )
      );
  }

  public collectionOnce$(
    queryFn: QueryFn = (ref) => ref,
    getOptions: firebase.firestore.GetOptions = { source: 'default' }
  ): Observable<T[]> {
    return this.adapter.firestore
      .collection<T>(this.path, (ref) => {
        return queryFn(ref.withConverter(this.converter));
      })
      .get(getOptions)
      .pipe(
        map((querySnapshot) => {
          const docSnapshots = querySnapshot.docs;
          const items = docSnapshots.map((docSnapshot) => {
            return this.getDataWithId(docSnapshot);
          });
          return items;
        })
      );
  }

  public update$(id: string, value: Partial<T>, setOptions: firebase.firestore.SetOptions = { merge: true }) {
    return this.docSet(id, value, setOptions);
  }

  public delete$(id: string) {
    return from(this.doc(id).delete()).pipe();
  }

  public create$(value: Partial<T>): Observable<string> {
    return this.upsert$(value);
  }

  public upsert$(value: Partial<T>, setOptions: firebase.firestore.SetOptions = { merge: true }): Observable<string> {
    let id;
    let newValue;

    if (Object.keys(value).includes(this.idField) && !!value[this.idField]) {
      id = value[this.idField];
      newValue = Object.assign({}, value);
    } else {
      id = this.createId();
      newValue = Object.assign({}, value, { [this.idField]: id });
    }

    return this.docSet(id, newValue, setOptions);
  }

  private getDataWithId<TData>(doc: QueryDocumentSnapshot<TData>) {
    const data = doc.data();
    const id = (data && data[this.idField]) || doc.id;
    return { ...data, [this.idField]: id };
  }

  private doc(id: string) {
    return this.adapter.firestore.doc(this.docRef(id));
  }

  private docSet(id: string, value: any, setOptions?: firebase.firestore.SetOptions) {
    if (this.isOffline()) {
      this.doc(id).set(value, setOptions);
      return of(id);
    }

    if (this.adapter.options && this.adapter.options.timeoutWriteOperations) {
      return from(this.doc(id).set(value, setOptions)).pipe(
        timeoutWith(this.adapter.options.timeoutWriteOperations, of(id)),
        mapTo(id)
      );
    } else {
      return from(this.doc(id).set(value, setOptions)).pipe(mapTo(id));
    }
  }

  private docRef(id: string) {
    return this.adapter.firestore.doc(`${this.path}/${id}`).ref.withConverter(this.converter);
  }

  private isOffline() {
    return navigator.onLine !== undefined && !navigator.onLine;
  }
}

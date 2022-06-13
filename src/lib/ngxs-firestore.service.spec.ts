import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { doc, DocumentReference, Firestore, setDoc } from '@angular/fire/firestore';
import { Store } from '@ngxs/store';
import { NgxsFirestore } from './ngxs-firestore.service';

jest.mock('@angular/fire/firestore');

describe('NgxsFirestore', () => {
  const createIdMock = jest.fn();
  const mockDoc = jest.mocked(doc);
  mockDoc.mockImplementation(() => ({ id: createIdMock(), withConverter: jest.fn() } as unknown as DocumentReference));
  jest.mocked(setDoc).mockResolvedValue();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: jest.fn() },
        { provide: Store, useValue: jest.fn() }
      ]
    });
  });

  it('cant be directly instantiated', () => {
    expect(() => {
      TestBed.inject(NgxsFirestore);
    }).toThrowError('No provider for NgxsFirestore!');
  });

  it('can be implemented and instantiated', () => {
    @Injectable({ providedIn: 'root' })
    class TestFirestore extends NgxsFirestore<{}> {
      protected path = 'test';
    }

    expect(TestBed.inject(TestFirestore)).toBeTruthy();
  });

  describe('', () => {
    @Injectable({ providedIn: 'root' })
    class ImplFirestore extends NgxsFirestore<{}> {
      protected path = 'impl';
    }

    describe('create$', () => {
      it('should create id if not provided', () => {
        // createIdMock.mockReturnValue('newId');
        const service: ImplFirestore = TestBed.inject(ImplFirestore);
        service.create$({}).subscribe((id) => {
          expect(id).toEqual('newId');
        });
      });

      it('should return id when provided', () => {
        const service: ImplFirestore = TestBed.inject(ImplFirestore);
        service.create$({ id: 'someid' }).subscribe((id) => {
          expect(id).toEqual('someid');
        });
      });
    });

    describe('upsert$', () => {
      it('should create id if not provided', () => {
        createIdMock.mockReturnValue('newId');
        const service: ImplFirestore = TestBed.inject(ImplFirestore);
        service.upsert$({}).subscribe((id) => {
          expect(id).toEqual('newId');
        });
      });

      it('should return id when provided', () => {
        const service: ImplFirestore = TestBed.inject(ImplFirestore);
        service.upsert$({ id: 'someid' }).subscribe((id) => {
          expect(id).toEqual('someid');
        });
      });
    });
  });
});

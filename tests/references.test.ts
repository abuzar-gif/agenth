import {it,expect} from 'vitest';
import {resolveReferences} from '../src/lib/references';
it('feeds verified search identifiers into subsequent tools',()=>{const results=new Map([[0,{messages:[{id:'actual-id'}]}]]);expect(resolveReferences({id:'$step:0.messages.0.id'},results)).toEqual({id:'actual-id'});});
it('blocks missing and prototype references instead of inventing values',()=>{expect(()=>resolveReferences('$step:0.messages.0.id',new Map())).toThrow();expect(()=>resolveReferences('$step:0.__proto__',new Map([[0,{}]]))).toThrow();});

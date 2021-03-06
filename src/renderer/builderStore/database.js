import {bbWritable} from "./useLocalStorage";
import {hierarchy as hierarchyFunctions, 
    common, getTemplateApi } from "budibase-core"; 
import {filter, cloneDeep, sortBy, map,
    find, isEmpty} from "lodash/fp";
import {chain, getNode, validate,
    constructHierarchy, templateApi} from "../common/core";

export const getDatabaseStore = () => {
    const writable = bbWritable(
        "database", {
        hierarchy: {},
        actions: [],
        triggers: [],
        currentNodeIsNew: false,
        errors: [],
        accessLevels: [],
        currentNode: null}, 
        db => {
            if(!!db.hierarchy && !isEmpty(db.hierarchy)) {
                db.hierarchy = constructHierarchy(db.hierarchy);
                const shadowHierarchy = createShadowHierarchy(db.hierarchy);
                if(db.currentNode !== null)
                    db.currentNode = getNode(
                        shadowHierarchy, db.currentNode.nodeId
                    );
            }
            return db;
        });

    writable.newChildRecord = newRecord(writable, false);
    writable.newRootRecord = newRecord(writable, true);
    writable.selectExistingNode = selectExistingNode(writable);
    writable.newChildIndex = newIndex(writable, false);
    writable.newRootIndex = newIndex(writable, true);
    writable.saveCurrentNode = saveCurrentNode(writable);
    writable.importAppDefinition = importAppDefinition(writable);
    writable.deleteCurrentNode = deleteCurrentNode(writable);
    writable.saveField = saveField(writable);
    writable.deleteField = deleteField(writable);
    writable.saveAction = saveAction(writable);
    writable.deleteAction = deleteAction(writable);
    writable.saveTrigger = saveTrigger(writable);
    writable.deleteTrigger = deleteTrigger(writable);
    writable.saveLevel = saveLevel(writable);
    writable.deleteLevel = deleteLevel(writable);
    return writable;
} 

export default getDatabaseStore;

const newRecord = (databaseStore, useRoot) => () => {
    databaseStore.update(db => {
        db.currentNodeIsNew = true;
        const shadowHierarchy = createShadowHierarchy(db.hierarchy);
        parent = useRoot ? shadowHierarchy
                 : getNode(
                    shadowHierarchy, 
                    db.currentNode.nodeId);
        db.errors = [];
        db.currentNode = templateApi(shadowHierarchy)
                         .getNewRecordTemplate(parent, "", true);
        return db;
    });
}


const selectExistingNode = (databaseStore) => (nodeId) => {
    databaseStore.update(db => {
        const shadowHierarchy = createShadowHierarchy(db.hierarchy);
        db.currentNode = getNode(
            shadowHierarchy, nodeId
        );
        db.currentNodeIsNew = false;
        db.errors = [];
        return db;
    })
}

const newIndex = (databaseStore, useRoot) => () => {
    databaseStore.update(db => {
        db.currentNodeIsNew = true;
        db.errors = [];
        const shadowHierarchy = createShadowHierarchy(db.hierarchy);
        parent = useRoot ? shadowHierarchy
                 : getNode(
                    shadowHierarchy, 
                    db.currentNode.nodeId);

        db.currentNode = templateApi(shadowHierarchy)
                         .getNewIndexTemplate(parent);
        return db;
    });
}

const saveCurrentNode = (databaseStore) => () => {
    databaseStore.update(db => {

        const errors = validate.node(db.currentNode);
        db.errors = errors;
        if(errors.length > 0) {
            return db;
        }

        const parentNode = getNode(
            db.hierarchy, db.currentNode.parent().nodeId);

        const existingNode = getNode(
            db.hierarchy, db.currentNode.nodeId);

        let index = parentNode.children.length;
        if(!!existingNode) {
            // remove existing
            index = existingNode.parent().children.indexOf(existingNode);
            existingNode.parent().children = chain(existingNode.parent().children, [
                filter(c => c.nodeId !== existingNode.nodeId)
            ]);
        }

        // should add node into existing hierarchy
        const cloned = cloneDeep(db.currentNode);
        templateApi(db.hierarchy).constructNode(
            parentNode, 
            cloned
        );

        const newIndexOfchild = child => {
            if(child === cloned) return index;
            const currentIndex = parentNode.children.indexOf(child);
            return currentIndex >= index ? currentIndex + 1 : currentIndex;
        }

        parentNode.children = chain(parentNode.children, [
            sortBy(newIndexOfchild)
        ]);

        db.currentNodeIsNew = false;
        
        return db;
    });
}

const importAppDefinition = databaseStore => appDefinition => {
    databaseStore.update(db => {
        db.hierarchy = appDefinition.hierarchy;
        db.currentNode = appDefinition.hierarchy.children.length > 0
                         ? appDefinition.hierarchy.children[0] 
                         : null;
        db.actions = appDefinition.actions;
        db.triggers = appDefinition.triggers;
        db.currentNodeIsNew = false; 
        return db;
    })
} 

const deleteCurrentNode = databaseStore => () => {
    databaseStore.update(db => {
        const nodeToDelete = getNode(db.hierarchy, db.currentNode.nodeId);
        db.currentNode = hierarchyFunctions.isRoot(nodeToDelete.parent())
                         ? find(n => n != db.currentNode)
                               (db.hierarchy.children)
                         : nodeToDelete.parent();
        if(hierarchyFunctions.isRecord(nodeToDelete)) {
            nodeToDelete.parent().children = filter(c => c.nodeId !== nodeToDelete.nodeId)
                                                   (nodeToDelete.parent().children);
        } else {
            nodeToDelete.parent().indexes = filter(c => c.nodeId !== nodeToDelete.nodeId)
                                                   (nodeToDelete.parent().indexes);
        }
        db.errors = [];
        return db;
    });
}

const saveField = databaseStore => (field) => {
    databaseStore.update(db => {
        db.currentNode.fields = filter(f => f.name !== field.name)
                                      (db.currentNode.fields);
            
        templateApi(db.hierarchy).addField(db.currentNode, field);
        return db;
    });
}


const deleteField = databaseStore => field => {
    databaseStore.update(db => {
        db.currentNode.fields = filter(f => f.name !== field.name)
                                      (db.currentNode.fields);

        return db;
    });
}


const saveAction = databaseStore => (newAction, isNew, oldAction=null) => {
    databaseStore.update(db => {

        const existingAction = isNew 
                               ? null
                               : find(a => a.name === oldAction.name)(db.actions);
            
        if(existingAction) {
            db.actions = chain(db.actions, [
                map(a => a === existingAction ? newAction : a)
            ]);
        } else {
            db.actions.push(newAction);
        }

        return db;
    })
}

const deleteAction  = databaseStore => action => {
    databaseStore.update(db => {
        db.actions = filter(a => a.name !== action.name)(db.actions);
        return db;
    })
}

const saveTrigger = databaseStore => (newTrigger, isNew, oldTrigger=null) => {
    databaseStore.update(db => {

        const existingTrigger = isNew 
                               ? null
                               : find(a => a.name === oldTrigger.name)(db.triggers);
            
        if(existingTrigger) {
            db.triggers = chain(db.triggers, [
                map(a => a === existingTrigger ? newTrigger : a)
            ]);
        } else {
            db.triggers.push(newTrigger);
        }

        return db;
    })
}

const deleteTrigger  = databaseStore => trigger => {
    databaseStore.update(db => {
        db.triggers = filter(t => t.name !== trigger.name)(db.triggers);
        return db;
    })
}

const saveLevel = databaseStore => (newLevel, isNew, oldLevel=null) => {
    databaseStore.update(db => {

        const existingLevel = isNew 
                               ? null
                               : find(a => a.name === oldLevel.name)(db.accessLevels);
            
        if(existingLevel) {
            db.accessLevels = chain(db.accessLevels, [
                map(a => a === existingLevel ? newLevel : a)
            ]);
        } else {
            db.accessLevels.push(newLevel);
        }

        return db;
    })
}

const deleteLevel = databaseStore => level => {
    databaseStore.update(db => {
        db.accessLevels = filter(t => t.name !== level.name)(db.accessLevels);
        return db;
    })
}

const createShadowHierarchy = hierarchy => 
    constructHierarchy(JSON.parse(JSON.stringify(hierarchy)));


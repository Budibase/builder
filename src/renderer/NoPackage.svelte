<script>

import Button from "./common/Button.svelte"
import {packageInfo, createNewPackage} from "./builderStore"
import {remote} from "electron";

let errors = [];

const openPackage = () => {
    const path = remote.dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if(!path) return;
    
    errors = packageInfo.openPackage(path[0]);
}

</script>

<div class="root">
    <div class="inner">
        <img src="./assets/budibase-logo.png" class="logo" alt="budibase logo"/>
        <div>
            
            <div>
                <h4 style="margin-bottom: 20px">What would you like to do?</h4>
                <Button color="primary"
                        on:click={createNewPackage}
                        class="option">
                    Create a New Package
                </Button>
                <Button color="primary-outline"
                        on:click={openPackage}
                        class="option">
                    Import a Package
                </Button>
            </div>
        </div>
    </div>
</div>

<style>

.root {
    position: fixed;
    margin: 0 auto;
    text-align: center;
    top: 20%;
    /*color: #333333;
    background-color: #fdfdfd;*/
    width:100%;
}

.inner {
    display:inline-block;
    margin: auto;
}

.logo {
    width: 300px;
    margin-bottom: 40px;
}

.root :global(.option) {
    width:250px;
}

</style>
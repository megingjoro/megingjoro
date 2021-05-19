import { useEffect, useState } from "react";
import { merge, formatAddress, useGlobalState, midgardRequest } from "./utils";
import { defaultWorksapces } from "./constants";

import Icon from "./components/icon";
import Node from "./components/node";

const nodeSiblingNameMap = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

function App() {
  const [network, setNetwork] = useGlobalState("network", "mainnet");
  const [address, setAddress] = useGlobalState("address", "");
  const [pools, setPools] = useGlobalState("pools", []);
  const [stats, setStats] = useGlobalState("stats", null);
  const [workspaces, setWorkspaces] = useState(
    JSON.parse(localStorage.workspaces || defaultWorksapces)
  );
  const [selectedWorkspaceIndex, setSelectedWorkspaceIndex] = useState(0);
  const selectedWorkspace = workspaces[selectedWorkspaceIndex];

  useEffect(() => {
    if (!window.xfi || !window.xfi.thorchain) return;
    window.xfi.thorchain.request(
      { method: "request_accounts", params: [] },
      (err, accounts) => {
        if (err) return console.error(err);
        setNetwork(window.xfi.thorchain.network);
        setAddress(accounts[0]);
      }
    );
  }, []);
  useEffect(() => {
    const refresh = () => {
      const n = network || "mainnet";
      midgardRequest(n, "/pools").then(setPools);
      midgardRequest(n, "/stats").then(setStats);
    };
    refresh();
    const handle = setInterval(refresh, 15000);
    return () => clearInterval(handle);
  }, [network]);

  function onSetAddress() {
    const newAddress = prompt("THORChain address:", address);
    if (address) setAddress(newAddress);
  }

  function onUpdateWorkspace(update, path) {
    if (path.length === 0) {
      selectedWorkspace.root = update(selectedWorkspace.root);
    } else {
      const parent = path.slice(0, -1).reduce((parent, leaf) => {
        return parent[leaf];
      }, selectedWorkspace.root);
      const tail = path[path.length - 1];
      let node = parent ? parent[tail] : selectedWorkspace.root;
      node = update(node);
      if (!node) {
        Object.assign(
          parent,
          merge(parent[nodeSiblingNameMap[tail]], { size: parent.size })
        );
      } else {
        parent[tail] = node;
      }
    }

    workspaces[selectedWorkspaceIndex] = merge({}, selectedWorkspace);
    setWorkspaces(workspaces.slice());
    // debugging
    window.globalWorkspaces = workspaces;
  }

  return (
    <div>
      <header className="header">
        <a className="header-brand" href="/">
          megingjoro
        </a>
        <div className="header-workspaces">
          <WorkspacesNav
            workspaces={workspaces}
            setWorkspaces={setWorkspaces}
            selectedWorkspaceIndex={selectedWorkspaceIndex}
            setSelectedWorkspaceIndex={setSelectedWorkspaceIndex}
          />
        </div>
        <div className="nav nav-right">
          <span className="nav-text text-primary">
            {address ? formatAddress(address) + " (" + network + ")" : ""}
          </span>
          &nbsp;
          <a className="nav-text text-bold" onClick={onSetAddress}>
            change
          </a>
        </div>
      </header>
      <div className="workspace">
        <Node
          {...selectedWorkspace.root}
          path={[]}
          updateWorkspace={onUpdateWorkspace}
        />
      </div>
    </div>
  );
}

function WorkspacesNav({
  workspaces,
  setWorkspaces,
  selectedWorkspaceIndex,
  setSelectedWorkspaceIndex,
}) {
  function onAdd(e) {
    e.preventDefault();
    setWorkspaces((workspaces) => {
      workspaces = workspaces.concat({
        name: "new workspace",
        root: { type: "node", size: 100, data: { type: "empty" } },
      });
      return workspaces;
    });
  }
  function onRemove(e) {
    e.preventDefault();
    setWorkspaces((workspaces) => {
      workspaces.splice(selectedWorkspaceIndex, 1);
      return workspaces.splice();
    });
  }
  function onRename(e) {
    e.preventDefault();
    const newName = prompt("New Name", workspaces[selectedWorkspaceIndex].name);
    if (!newName) return;
    setWorkspaces((workspaces) => {
      const i = selectedWorkspaceIndex;
      workspaces[i] = { ...workspaces[i], name: newName };
      return workspaces.slice();
    });
  }
  function onSave(e) {
    e.preventDefault();
    localStorage.workspaces = JSON.stringify(workspaces);
  }

  return (
    <div className="workspaces-nav">
      <div className="workspaces-nav-current">
        {workspaces[selectedWorkspaceIndex].name}
      </div>
      <div className="workspaces-nav-dropdown">
        {workspaces.map((w, i) => (
          <a
            key={i}
            onClick={() => setSelectedWorkspaceIndex(i)}
            className={selectedWorkspaceIndex === i ? "is-active" : ""}
          >
            {w.name}
          </a>
        ))}
        <a onClick={onAdd} title="add">
          <Icon name="plus" /> add
        </a>
        <a onClick={onRemove} title="delete">
          <Icon name="trash" /> delete
        </a>
        <a onClick={onRename} title="rename">
          <Icon name="edit" /> rename
        </a>
        <a onClick={onSave} title="save">
          <Icon name="save" /> save
        </a>
      </div>
    </div>
  );
}

export default App;
